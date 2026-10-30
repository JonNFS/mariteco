'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { couponPreviewSchema, payOrderSchema } from '@/lib/validators';
import { rateLimit } from '@/lib/rate-limit';
import { computeQuote } from '@/lib/quote';
import { getSettings } from '@/lib/settings';
import { createMpOrder, MpError } from '@/lib/mercadopago';
import { mapMpStatus } from '@/lib/mp-status';
import { applyMpOrder } from '@/lib/orders';
import { notifyOrder } from '@/lib/notify';

export type QuoteResult =
  | {
      ok: true;
      subtotalCents: number;
      shippingCents: number;
      shippingName: string;
      giftFeeCents: number;
      discountCents: number;
      totalCents: number;
      estimatedDelivery: string;
      couponApplied: boolean;
      couponError: string | null;
    }
  | { ok: false; error: string };

export type PayResult =
  | { ok: true; orderId: string; paid: boolean }
  | { ok: false; error: string; orderId?: string; needsLogin?: boolean };

async function currentUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return { supabase, user: data.user };
}

/** Prévia dos valores (só exibição). O valor cobrado é recalculado em payOrder / create_order. */
export async function previewQuote(input: unknown): Promise<QuoteResult> {
  if (!isSupabaseConfigured) return { ok: false, error: 'Loja em modo demonstração.' };
  const { user } = await currentUser();
  if (!user) return { ok: false, error: 'Faça login para continuar.' };
  if (!rateLimit(`quote:${user.id}`, 30, 60_000)) return { ok: false, error: 'Muitas tentativas. Aguarde um instante.' };
  const p = couponPreviewSchema.safeParse(input);
  if (!p.success) return { ok: false, error: 'Confira os dados.' };
  const q = await computeQuote(user.id, p.data);
  if (!q.ok) return q;
  return {
    ok: true,
    subtotalCents: q.subtotalCents,
    shippingCents: q.shipping.priceCents,
    shippingName: q.shipping.name,
    giftFeeCents: q.giftFeeCents,
    discountCents: q.discountCents,
    totalCents: q.totalCents,
    estimatedDelivery: q.estimatedDelivery,
    couponApplied: !!q.couponCode,
    couponError: q.couponError,
  };
}

const CARD_MESSAGES: Record<string, string> = {
  cc_rejected_insufficient_amount: 'Saldo insuficiente no cartão. Tente outro cartão ou pague com Pix.',
  cc_rejected_bad_filled_card_number: 'Confira o número do cartão.',
  cc_rejected_bad_filled_date: 'Confira a validade do cartão.',
  cc_rejected_bad_filled_security_code: 'Confira o código de segurança.',
  cc_rejected_call_for_authorize: 'Seu banco pede autorização. Ligue para o banco ou tente outro meio de pagamento.',
};
function cardMessage(detail?: string) {
  return (detail && CARD_MESSAGES[detail.toLowerCase()]) || 'O pagamento não foi aprovado. Confira os dados, tente outro cartão ou pague com Pix.';
}

export async function payOrder(raw: unknown): Promise<PayResult> {
  if (!isSupabaseConfigured) return { ok: false, error: 'Loja em modo demonstração.' };
  const { supabase, user } = await currentUser();
  if (!user) return { ok: false, error: 'Sua sessão expirou. Entre novamente.', needsLogin: true };
  if (!rateLimit(`pay:${user.id}`, 8, 60_000)) return { ok: false, error: 'Muitas tentativas. Aguarde um minuto.' };

  const parsed = payOrderSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Confira os dados.' };
  const d = parsed.data;
  const admin = createAdminClient();
  const settings = await getSettings();

  // ---------- 1) pedido: cria (valores calculados no banco) ou retoma um existente ----------
  let orderId = d.orderId;
  let address: Record<string, string>;

  if (orderId) {
    const { data: o } = await admin.from('orders').select('id,user_id,address').eq('id', orderId).maybeSingle();
    if (!o || o.user_id !== user.id) return { ok: false, error: 'Pedido não encontrado.' };
    address = o.address as Record<string, string>;
  } else {
    const quote = await computeQuote(user.id, { cep: d.cep, shipping: d.shipping, couponCode: d.couponCode, giftWrap: d.giftWrap });
    if (!quote.ok) return { ok: false, error: quote.error };

    address = {
      recipient: d.recipient, phone: d.phone, cep: d.cep, street: d.street, number: d.number,
      complement: d.complement || '', neighborhood: d.neighborhood, city: d.city, state: d.state,
    };
    const { data: newId, error } = await admin.rpc('create_order', {
      p_user_id: user.id,
      p_address: address,
      p_shipping_method: quote.shipping.id,
      p_shipping_name: quote.shipping.name,
      p_shipping_cents: quote.shipping.priceCents,
      p_shipping_days: quote.shipping.days,
      p_estimated_delivery: quote.estimatedDelivery,
      p_coupon_code: d.couponCode || null,
      p_gift_wrap: d.giftWrap,
      p_gift_from: d.giftFrom || null,
      p_gift_to: d.giftTo || null,
      p_gift_message: d.giftMessage || null,
    });
    if (error || !newId) {
      const m = /MSG:(.*)$/m.exec(error?.message ?? '');
      return { ok: false, error: m ? m[1].trim() : 'Não foi possível finalizar o pedido. Tente novamente.' };
    }
    orderId = newId as string;

    // lembra telefone/endereço para a próxima compra (como o próprio usuário, via RLS)
    await supabase.from('profiles').update({ phone: d.phone }).eq('id', user.id);
    const { data: dup } = await supabase.from('addresses').select('id').eq('cep', d.cep).eq('number', d.number).limit(1);
    if (!dup?.length) {
      await supabase.from('addresses').insert({
        user_id: user.id, recipient: d.recipient, cep: d.cep, street: d.street, number: d.number,
        complement: d.complement || null, neighborhood: d.neighborhood, city: d.city, state: d.state,
      });
    }
  }

  // ---------- 2) nova tentativa de pagamento (o total vem do BANCO) ----------
  const minutes = d.method === 'pix' ? settings.pixExpirationMinutes : d.method === 'boleto' ? settings.boletoExpirationDays * 1440 : 30;
  const expiresAt = new Date(Date.now() + minutes * 60_000).toISOString();
  const { data: att } = await admin.rpc('begin_payment_attempt', {
    p_order_id: orderId, p_user_id: user.id, p_method: d.method, p_expires_at: expiresAt,
  });
  const attempt = Array.isArray(att) ? att[0] : att;
  if (!attempt) return { ok: false, orderId, error: 'Este pedido não pode mais ser pago. Veja seus pedidos na conta.' };

  if (d.method === 'credit_card' && d.card!.installments > settings.maxInstallments) {
    return { ok: false, orderId, error: `Parcelamento em até ${settings.maxInstallments}x.` };
  }

  // ---------- 3) cobrança no Mercado Pago ----------
  const [first, ...rest] = String(address.recipient || 'Cliente').trim().split(/\s+/);
  try {
    const mp = await createMpOrder({
      orderId,
      attempt: attempt.attempt,
      totalCents: attempt.total_cents,
      method: d.method,
      payer: {
        email: user.email!,
        firstName: first,
        lastName: rest.join(' ') || first,
        cpf: d.cpf,
        address: {
          street: address.street, number: address.number, neighborhood: address.neighborhood,
          city: address.city, state: address.state, cep: address.cep,
        },
      },
      card: d.card,
      pixMinutes: settings.pixExpirationMinutes,
      boletoDays: settings.boletoExpirationDays,
      deviceId: d.deviceId,
    });
    if (mp.id) await admin.from('orders').update({ mp_order_id: mp.id }).eq('id', orderId);

    const result = await applyMpOrder(mp);
    revalidatePath('/conta');
    const state = mapMpStatus(mp);

    if (state === 'approved' || result === 'paid' || result === 'already_paid') return { ok: true, orderId, paid: true };
    if (state === 'rejected' || state === 'cancelled' || state === 'expired') {
      await admin.from('orders').update({ payment_status: 'rejected' }).eq('id', orderId).eq('status', 'aguardando_pagamento');
      return { ok: false, orderId, error: cardMessage(mp.transactions?.payments?.[0]?.status_detail) };
    }
    // Pix / boleto aguardando (ou cartão em análise): a página do pedido mostra o próximo passo
    if (d.method !== 'credit_card') await notifyOrder(orderId, 'order_created');
    return { ok: true, orderId, paid: false };
  } catch (e) {
    console.error('[pay]', orderId, e instanceof MpError ? { status: e.status, body: e.body } : e);
    return { ok: false, orderId, error: 'Não conseguimos falar com o meio de pagamento agora. Seu pedido está reservado — tente de novo em instantes.' };
  }
}

/** Cliente cancela um pedido que ainda não foi pago (libera estoque e cupom). */
export async function cancelUnpaidOrder(orderId: string): Promise<{ ok: boolean; error?: string }> {
  const { user } = await currentUser();
  if (!user) return { ok: false, error: 'Faça login.' };
  const admin = createAdminClient();
  const { data: o } = await admin.from('orders').select('user_id,status,payment_status,payment_method').eq('id', orderId).maybeSingle();
  if (!o || o.user_id !== user.id) return { ok: false, error: 'Pedido não encontrado.' };
  const safe = o.status === 'aguardando_pagamento' && (!o.payment_method || ['rejected', 'expired'].includes(o.payment_status));
  if (!safe) return { ok: false, error: 'Este pedido não pode ser cancelado agora. Fale com a gente pelo WhatsApp.' };
  const { error } = await admin.rpc('cancel_order', { p_order_id: orderId });
  if (error) return { ok: false, error: 'Não foi possível cancelar.' };
  revalidatePath('/conta');
  return { ok: true };
}
