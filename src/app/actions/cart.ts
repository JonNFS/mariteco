'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { uuidSchema } from '@/lib/validators';
import { z } from 'zod';

export type CartResult = { ok: true } | { ok: false; error: string; needsLogin?: boolean };

const qtySchema = z.number().int().min(1).max(20);

export async function addToCart(variantId: string, quantity: number): Promise<CartResult> {
  if (!isSupabaseConfigured) return { ok: false, error: 'Loja em modo demonstração.' };
  const v = uuidSchema.safeParse(variantId);
  const q = qtySchema.safeParse(quantity);
  if (!v.success || !q.success) return { ok: false, error: 'Dados inválidos.' };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: 'Faça login para comprar.', needsLogin: true };

  // O estoque e a existência do produto são conferidos no banco (RLS só mostra produtos ativos).
  const { data: variant } = await supabase
    .from('product_variants')
    .select('id, stock')
    .eq('id', v.data)
    .maybeSingle();
  if (!variant) return { ok: false, error: 'Produto indisponível.' };

  const { data: existing } = await supabase
    .from('cart_items')
    .select('quantity')
    .eq('user_id', auth.user.id)
    .eq('variant_id', variant.id)
    .maybeSingle();

  const newQty = (existing?.quantity ?? 0) + q.data;
  if (variant.stock < 1) return { ok: false, error: 'Tamanho esgotado.' };
  if (newQty > variant.stock) {
    return { ok: false, error: `Só temos ${variant.stock} unidade(s) deste tamanho.` };
  }

  const { error } = await supabase
    .from('cart_items')
    .upsert({ user_id: auth.user.id, variant_id: variant.id, quantity: newQty }, { onConflict: 'user_id,variant_id' });
  if (error) return { ok: false, error: 'Não foi possível adicionar à sacola.' };

  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function updateCartQty(formData: FormData) {
  const id = uuidSchema.safeParse(formData.get('id'));
  const q = qtySchema.safeParse(Number(formData.get('quantity')));
  if (!id.success || !q.success || !isSupabaseConfigured) return;

  const supabase = await createClient();
  const { data: item } = await supabase
    .from('cart_items')
    .select('id, variant:product_variants(stock)')
    .eq('id', id.data)
    .maybeSingle(); // RLS: só enxerga itens do próprio usuário
  if (!item) return;
  const stock = (Array.isArray(item.variant) ? item.variant[0] : item.variant)?.stock ?? 0;
  const qty = Math.min(q.data, Math.max(stock, 1));
  await supabase.from('cart_items').update({ quantity: qty }).eq('id', item.id);
  revalidatePath('/', 'layout');
}

export async function removeCartItem(formData: FormData) {
  const id = uuidSchema.safeParse(formData.get('id'));
  if (!id.success || !isSupabaseConfigured) return;
  const supabase = await createClient();
  await supabase.from('cart_items').delete().eq('id', id.data);
  revalidatePath('/', 'layout');
}
