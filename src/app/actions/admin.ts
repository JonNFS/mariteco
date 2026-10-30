'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { productSchema, uuidSchema } from '@/lib/validators';
import { slugify } from '@/lib/utils';
import { ORDER_STATUS_LIST } from '@/lib/constants';
import { notifyOrder } from '@/lib/notify';

export type AdminResult = { ok: true; id?: string; message?: string } | { ok: false; error: string };

/** Confere no servidor que quem chama é admin. (Além disso, o RLS do banco também exige is_admin().) */
async function getAdmin() {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: p } = await supabase.from('profiles').select('role').eq('id', data.user.id).maybeSingle();
  return p?.role === 'admin' ? { supabase, userId: data.user.id } : null;
}

const isStoragePath = (p: string) => p.startsWith('products/');

export async function saveProduct(raw: unknown): Promise<AdminResult> {
  const admin = await getAdmin();
  if (!admin) return { ok: false, error: 'Sem permissão.' };
  const { supabase } = admin;

  const parsed = productSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  const d = parsed.data;

  const sizes = d.variants.map((v) => v.size.toLowerCase());
  if (new Set(sizes).size !== sizes.length) return { ok: false, error: 'Há tamanhos repetidos.' };
  if (d.compareAtCents !== null && d.compareAtCents <= d.priceCents) return { ok: false, error: 'O preço "de" precisa ser maior que o preço atual.' };

  const fields = {
    name: d.name,
    description: d.description,
    category_id: d.categoryId,
    gender: d.gender,
    size_type: d.sizeType,
    price_cents: d.priceCents,
    compare_at_cents: d.compareAtCents,
    weight_grams: d.weightGrams,
    active: d.active,
    featured: d.featured,
  };

  let productId = d.id;
  let oldImages: string[] = [];

  if (productId) {
    const { error } = await supabase.from('products').update(fields).eq('id', productId);
    if (error) return { ok: false, error: 'Não foi possível salvar o produto.' };
    const { data: imgs } = await supabase.from('product_images').select('path').eq('product_id', productId);
    oldImages = (imgs ?? []).map((i) => i.path);
  } else {
    let created: { id: string } | null = null;
    for (let i = 0; i < 3 && !created; i++) {
      const slug = `${slugify(d.name) || 'produto'}-${crypto.randomUUID().slice(0, 4)}`;
      const { data, error } = await supabase.from('products').insert({ ...fields, slug }).select('id').single();
      if (!error) created = data;
      else if (error.code !== '23505') return { ok: false, error: 'Não foi possível criar o produto.' };
    }
    if (!created) return { ok: false, error: 'Não foi possível gerar o endereço do produto. Tente de novo.' };
    productId = created.id;
  }

  // Tamanhos: atualiza estoque dos existentes, cria novos, remove os que saíram (mantém os ids → sacolas intactas)
  const { data: existing } = await supabase.from('product_variants').select('id, size').eq('product_id', productId);
  const bySize = new Map((existing ?? []).map((v) => [v.size.toLowerCase(), v.id]));
  for (const v of d.variants) {
    const id = bySize.get(v.size.toLowerCase());
    const { error } = id
      ? await supabase.from('product_variants').update({ size: v.size, stock: v.stock }).eq('id', id)
      : await supabase.from('product_variants').insert({ product_id: productId, size: v.size, stock: v.stock });
    if (error) return { ok: false, error: `Erro ao salvar o tamanho ${v.size}.` };
  }
  const keep = new Set(sizes);
  const remove = (existing ?? []).filter((v) => !keep.has(v.size.toLowerCase())).map((v) => v.id);
  if (remove.length) await supabase.from('product_variants').delete().in('id', remove);

  // Imagens: regrava a lista na ordem recebida (a primeira é a capa)
  await supabase.from('product_images').delete().eq('product_id', productId);
  if (d.images.length) {
    const { error } = await supabase.from('product_images').insert(d.images.map((path, position) => ({ product_id: productId, path, position })));
    if (error) return { ok: false, error: 'Produto salvo, mas houve erro nas imagens.' };
  }
  const orphan = oldImages.filter((p) => isStoragePath(p) && !d.images.includes(p));
  if (orphan.length) await supabase.storage.from('product-images').remove(orphan);

  revalidatePath('/', 'layout');
  return { ok: true, id: productId };
}

export async function setProductActive(id: string, active: boolean): Promise<AdminResult> {
  const admin = await getAdmin();
  if (!admin) return { ok: false, error: 'Sem permissão.' };
  if (!uuidSchema.safeParse(id).success) return { ok: false, error: 'Produto inválido.' };
  const { error } = await admin.supabase.from('products').update({ active }).eq('id', id);
  if (error) return { ok: false, error: 'Não foi possível atualizar.' };
  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function deleteProduct(id: string): Promise<AdminResult> {
  const admin = await getAdmin();
  if (!admin) return { ok: false, error: 'Sem permissão.' };
  if (!uuidSchema.safeParse(id).success) return { ok: false, error: 'Produto inválido.' };
  const { supabase } = admin;
  const { data: imgs } = await supabase.from('product_images').select('path').eq('product_id', id);
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) return { ok: false, error: 'Não foi possível excluir.' };
  const files = (imgs ?? []).map((i) => i.path).filter(isStoragePath);
  if (files.length) await supabase.storage.from('product-images').remove(files);
  revalidatePath('/', 'layout');
  return { ok: true };
}

const orderSchema = z.object({
  id: uuidSchema,
  status: z.enum(ORDER_STATUS_LIST as [string, ...string[]]),
  tracking: z.string().trim().max(60).optional().default(''),
});

export async function updateOrder(_prev: AdminResult | undefined, formData: FormData): Promise<AdminResult> {
  const admin = await getAdmin();
  if (!admin) return { ok: false, error: 'Sem permissão.' };
  const parsed = orderSchema.safeParse({ id: formData.get('id'), status: formData.get('status'), tracking: formData.get('tracking') ?? '' });
  if (!parsed.success) return { ok: false, error: 'Dados inválidos.' };
  const { id, status, tracking } = parsed.data;

  const { data: current } = await admin.supabase.from('orders').select('status').eq('id', id).maybeSingle();
  if (!current) return { ok: false, error: 'Pedido não encontrado.' };
  if (current.status === 'cancelado' && status !== 'cancelado') return { ok: false, error: 'Pedido cancelado não pode ser reaberto.' };

  if (status === 'cancelado' && current.status !== 'cancelado') {
    // devolve o estoque (função só acessível pelo servidor)
    const { error } = await createAdminClient().rpc('cancel_order', { p_order_id: id });
    if (error) return { ok: false, error: error.message.includes('enviado') ? 'Pedido já enviado não pode ser cancelado aqui.' : 'Não foi possível cancelar.' };
  } else if (status === 'pago' && current.status === 'aguardando_pagamento') {
    // confirmação manual (ex.: pagamento combinado pelo WhatsApp): usa a mesma função segura do webhook
    const { data: r, error } = await createAdminClient().rpc('mark_order_paid', { p_order_id: id, p_mp_order_id: null, p_installments: null });
    if (error) return { ok: false, error: 'Não foi possível confirmar o pagamento.' };
    if (tracking) await admin.supabase.from('orders').update({ tracking_code: tracking }).eq('id', id);
    if (r === 'paid') await notifyOrder(id, 'order_paid');
  } else {
    const { error } = await admin.supabase.from('orders').update({ status, tracking_code: tracking || null }).eq('id', id);
    if (error) return { ok: false, error: 'Não foi possível atualizar.' };
    if (status === 'enviado' && current.status !== 'enviado') await notifyOrder(id, 'order_shipped');
  }
  if (tracking && status === 'cancelado') {
    await admin.supabase.from('orders').update({ tracking_code: tracking }).eq('id', id);
  }

  revalidatePath('/admin/pedidos');
  return { ok: true, message: 'Pedido atualizado ✔' };
}


// ---------------------------------------------------------------------------
// CUPONS
// ---------------------------------------------------------------------------
const brDate = (v: string | null | undefined) => {
  if (!v) return null;
  const d = new Date(`${v}:00-03:00`); // campo datetime-local = horário de Brasília
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
};

const couponSchema = z.object({
  id: uuidSchema.optional(),
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,32}$/, 'Código: 3 a 32 letras, números, - ou _ (sem espaços)'),
  description: z.string().trim().max(120).optional().default(''),
  discountType: z.enum(['percent', 'fixed', 'free_shipping']),
  value: z.number().int().min(0).max(10_000_000),
  minSubtotalCents: z.number().int().min(0).max(10_000_000).default(0),
  maxDiscountCents: z.number().int().min(1).max(10_000_000).nullable(),
  maxUses: z.number().int().min(1).max(1_000_000).nullable(),
  maxUsesPerUser: z.number().int().min(1).max(1000).nullable(),
  startsAt: z.string().nullable(),
  expiresAt: z.string().nullable(),
  active: z.boolean(),
});

export async function saveCoupon(raw: unknown): Promise<AdminResult> {
  const admin = await getAdmin();
  if (!admin) return { ok: false, error: 'Sem permissão.' };
  const p = couponSchema.safeParse(raw);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? 'Dados inválidos.' };
  const d = p.data;
  if (d.discountType === 'percent' && (d.value < 1 || d.value > 100)) return { ok: false, error: 'Percentual deve ser entre 1 e 100.' };
  if (d.discountType === 'fixed' && d.value < 1) return { ok: false, error: 'Informe o valor do desconto.' };
  const startsAt = brDate(d.startsAt);
  const expiresAt = brDate(d.expiresAt);
  if (startsAt === undefined || expiresAt === undefined) return { ok: false, error: 'Data inválida.' };
  if (startsAt && expiresAt && expiresAt <= startsAt) return { ok: false, error: 'A validade precisa ser depois do início.' };

  const row = {
    code: d.code,
    description: d.description || null,
    discount_type: d.discountType,
    value: d.discountType === 'free_shipping' ? 0 : d.value,
    min_subtotal_cents: d.minSubtotalCents,
    max_discount_cents: d.discountType === 'percent' ? d.maxDiscountCents : null,
    max_uses: d.maxUses,
    max_uses_per_user: d.maxUsesPerUser,
    starts_at: startsAt,
    expires_at: expiresAt,
    active: d.active,
  };
  const q = d.id ? admin.supabase.from('coupons').update(row).eq('id', d.id) : admin.supabase.from('coupons').insert(row);
  const { error } = await q;
  if (error) return { ok: false, error: error.code === '23505' ? 'Já existe um cupom com este código.' : 'Não foi possível salvar o cupom.' };
  revalidatePath('/admin/cupons');
  return { ok: true };
}

export async function setCouponActive(id: string, active: boolean): Promise<AdminResult> {
  const admin = await getAdmin();
  if (!admin || !uuidSchema.safeParse(id).success) return { ok: false, error: 'Sem permissão.' };
  const { error } = await admin.supabase.from('coupons').update({ active }).eq('id', id);
  if (error) return { ok: false, error: 'Não foi possível atualizar.' };
  revalidatePath('/admin/cupons');
  return { ok: true };
}

export async function deleteCoupon(id: string): Promise<AdminResult> {
  const admin = await getAdmin();
  if (!admin || !uuidSchema.safeParse(id).success) return { ok: false, error: 'Sem permissão.' };
  const { error } = await admin.supabase.from('coupons').delete().eq('id', id);
  if (error) return { ok: false, error: 'Não foi possível excluir.' };
  revalidatePath('/admin/cupons');
  return { ok: true };
}

// ---------------------------------------------------------------------------
// MENSAGENS E CONFIGURAÇÕES
// ---------------------------------------------------------------------------
const templateSchema = z.object({
  key: z.enum(['order_created', 'order_paid', 'order_shipped']),
  emailSubject: z.string().trim().min(3).max(150),
  emailBody: z.string().trim().min(3).max(4000),
  whatsappBody: z.string().trim().min(3).max(2000),
  emailEnabled: z.boolean(),
  whatsappEnabled: z.boolean(),
});

export async function saveTemplate(raw: unknown): Promise<AdminResult> {
  const admin = await getAdmin();
  if (!admin) return { ok: false, error: 'Sem permissão.' };
  const p = templateSchema.safeParse(raw);
  if (!p.success) return { ok: false, error: 'Preencha o assunto e as mensagens.' };
  const d = p.data;
  const { error } = await admin.supabase.from('message_templates').update({
    email_subject: d.emailSubject, email_body: d.emailBody, whatsapp_body: d.whatsappBody,
    email_enabled: d.emailEnabled, whatsapp_enabled: d.whatsappEnabled, updated_at: new Date().toISOString(),
  }).eq('key', d.key);
  if (error) return { ok: false, error: 'Não foi possível salvar.' };
  revalidatePath('/admin/mensagens');
  return { ok: true, message: 'Mensagem salva ✔' };
}

const settingsSchema = z.object({
  giftWrapPriceCents: z.number().int().min(0).max(100_000),
  maxInstallments: z.number().int().min(1).max(12),
  pixExpirationMinutes: z.number().int().min(30).max(1440),
  boletoExpirationDays: z.number().int().min(1).max(30),
});

export async function saveSettings(raw: unknown): Promise<AdminResult> {
  const admin = await getAdmin();
  if (!admin) return { ok: false, error: 'Sem permissão.' };
  const p = settingsSchema.safeParse(raw);
  if (!p.success) return { ok: false, error: 'Confira os valores (parcelas 1–12, Pix 30–1440 min, boleto 1–30 dias).' };
  const d = p.data;
  const rows = [
    ['gift_wrap_price_cents', d.giftWrapPriceCents],
    ['max_installments', d.maxInstallments],
    ['pix_expiration_minutes', d.pixExpirationMinutes],
    ['boleto_expiration_days', d.boletoExpirationDays],
  ].map(([key, value]) => ({ key, value, updated_at: new Date().toISOString() }));
  const { error } = await admin.supabase.from('store_settings').upsert(rows, { onConflict: 'key' });
  if (error) return { ok: false, error: 'Não foi possível salvar.' };
  revalidatePath('/admin/configuracoes');
  revalidatePath('/checkout');
  return { ok: true, message: 'Configurações salvas ✔' };
}

/** Texto pronto para o botão "Enviar pelo WhatsApp" (o admin abre a conversa e envia manualmente). */
export async function getWhatsAppText(orderId: string, event: 'order_created' | 'order_paid' | 'order_shipped'): Promise<{ ok: boolean; url?: string; error?: string }> {
  const admin = await getAdmin();
  if (!admin || !uuidSchema.safeParse(orderId).success) return { ok: false, error: 'Sem permissão.' };
  const { renderOrderMessages } = await import('@/lib/notify');
  const m = await renderOrderMessages(orderId, event);
  if (!m) return { ok: false, error: 'Pedido ou mensagem não encontrados.' };
  if (!m.built.phone) return { ok: false, error: 'Cliente sem telefone válido.' };
  return { ok: true, url: `https://wa.me/${m.built.phone}?text=${encodeURIComponent(m.whatsappBody)}` };
}
