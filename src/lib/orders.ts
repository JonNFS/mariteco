import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { getMpOrder } from '@/lib/mercadopago';
import { mapMpStatus, toCents, type MpOrder } from '@/lib/mp-status';
import { notifyOrder } from '@/lib/notify';
import { uuidOk } from '@/lib/utils';

export type ApplyResult =
  | 'paid' | 'already_paid' | 'late_payment' | 'pending' | 'rejected' | 'expired' | 'cancelled' | 'refunded'
  | 'ignored' | 'not_found' | 'amount_mismatch';

/**
 * Aplica no nosso banco o estado de um pedido do Mercado Pago. Só aprova quando:
 *  1) a referência externa é um pedido NOSSO, e
 *  2) o valor cobrado é exatamente o total gravado no banco, e
 *  3) o Mercado Pago (consultado direto pela API, não pelo corpo do webhook) confirma o crédito.
 * Idempotente: pode ser chamada várias vezes (webhook repetido, polling, cron).
 */
export async function applyMpOrder(mp: MpOrder): Promise<ApplyResult> {
  const ref = mp.external_reference ?? '';
  if (!uuidOk(ref) || !mp.id) return 'ignored';
  const admin = createAdminClient();

  const { data: order } = await admin
    .from('orders')
    .select('id,total_cents,status,payment_status,mp_order_id')
    .eq('id', ref)
    .maybeSingle();
  if (!order) return 'not_found';

  if (toCents(mp.total_amount) !== order.total_cents) {
    console.error('[mp] valor diferente do pedido', { order: order.id, mp: mp.total_amount, db: order.total_cents });
    return 'amount_mismatch';
  }

  const state = mapMpStatus(mp);
  const pay = mp.transactions?.payments?.[0];
  const isCurrent = !order.mp_order_id || order.mp_order_id === mp.id;

  if (state === 'approved') {
    const { data: r } = await admin.rpc('mark_order_paid', {
      p_order_id: order.id,
      p_mp_order_id: mp.id,
      p_installments: pay?.payment_method?.installments ?? null,
    });
    if (r === 'paid') {
      await notifyOrder(order.id, 'order_paid');
      return 'paid';
    }
    if (r === 'late') {
      console.error('[mp] pagamento aprovado em pedido já cancelado — reembolsar/reativar manualmente', order.id);
      return 'late_payment';
    }
    if (order.mp_order_id && order.mp_order_id !== mp.id) {
      console.error('[mp] segundo pagamento aprovado para o mesmo pedido — reembolsar um deles', order.id, mp.id);
    }
    return 'already_paid';
  }

  if (state === 'refunded') {
    await admin.from('orders').update({ payment_status: 'refunded' }).eq('id', order.id);
    return 'refunded';
  }

  if (!isCurrent) return 'ignored'; // resposta de uma tentativa antiga

  if (state === 'pending') {
    const pm = pay?.payment_method;
    await admin
      .from('orders')
      .update({
        mp_order_id: mp.id,
        ...(pm?.qr_code ? { pix_qr_code: pm.qr_code, pix_qr_base64: pm.qr_code_base64 ?? null } : {}),
        ...(pm?.ticket_url ? { boleto_url: pm.ticket_url, boleto_line: pm.digitable_line ?? null, boleto_barcode: pm.barcode_content ?? null } : {}),
      })
      .eq('id', order.id)
      .eq('status', 'aguardando_pagamento');
    return 'pending';
  }

  await admin
    .from('orders')
    .update({ payment_status: state })
    .eq('id', order.id)
    .eq('status', 'aguardando_pagamento')
    .eq('payment_status', 'pending');
  return state;
}

/** Consulta o Mercado Pago e atualiza o pedido (usado pelo polling da tela e pelo webhook). */
export async function syncOrderPayment(orderId: string): Promise<ApplyResult | 'nothing'> {
  const admin = createAdminClient();
  const { data: o } = await admin
    .from('orders').select('mp_order_id,status,payment_status').eq('id', orderId).maybeSingle();
  if (!o?.mp_order_id) return 'nothing';
  if (o.status !== 'aguardando_pagamento' && o.payment_status !== 'pending') return 'nothing';
  try {
    return await applyMpOrder(await getMpOrder(o.mp_order_id));
  } catch (e) {
    console.error('[mp] falha ao consultar pedido', orderId, e instanceof Error ? e.message : e);
    return 'nothing';
  }
}
