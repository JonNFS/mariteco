import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { calculateShipping, type ShippingOption } from '@/lib/shipping';
import { cartTotals, getCart } from '@/lib/cart';
import { getSettings } from '@/lib/settings';
import { estimatedDeliveryISO } from '@/lib/delivery';

export type Quote = {
  ok: true;
  subtotalCents: number;
  shipping: ShippingOption;
  giftFeeCents: number;
  discountCents: number;
  totalCents: number;
  estimatedDelivery: string;
  couponCode: string | null;
  couponError: string | null;
} | { ok: false; error: string };

/**
 * Cálculo de valores para EXIBIÇÃO. O valor que realmente é cobrado é recalculado de novo
 * dentro da função SQL create_order (preços do banco) — este resultado nunca é aceito do navegador.
 */
export async function computeQuote(
  userId: string,
  input: { cep: string; shipping: string; couponCode?: string | null; giftWrap?: boolean },
): Promise<Quote> {
  const cart = await getCart(userId);
  if (cart.length === 0) return { ok: false, error: 'Sua sacola está vazia.' };
  const t = cartTotals(cart);
  const { options } = calculateShipping({ cep: input.cep, subtotalCents: t.subtotalCents, weightGrams: t.weightGrams });
  const shipping = options.find((o) => o.id === input.shipping);
  if (!shipping) return { ok: false, error: 'Escolha uma opção de entrega válida para o seu CEP.' };

  const settings = await getSettings();
  const giftFeeCents = input.giftWrap ? settings.giftWrapPriceCents : 0;

  let discountCents = 0;
  let couponError: string | null = null;
  const code = (input.couponCode ?? '').trim().toUpperCase();
  if (code) {
    const { data } = await createAdminClient().rpc('coupon_quote', {
      p_user_id: userId, p_code: code, p_subtotal: t.subtotalCents, p_shipping: shipping.priceCents,
    });
    const row = Array.isArray(data) ? data[0] : data;
    if (row?.error) couponError = row.error;
    else if (row) {
      const floor = Math.max(t.subtotalCents + shipping.priceCents + giftFeeCents - 100, 0); // mínimo R$ 1,00
      discountCents = Math.min(row.discount_cents ?? 0, floor);
    }
  }

  return {
    ok: true,
    subtotalCents: t.subtotalCents,
    shipping,
    giftFeeCents,
    discountCents,
    totalCents: t.subtotalCents + shipping.priceCents + giftFeeCents - discountCents,
    estimatedDelivery: estimatedDeliveryISO(shipping.days),
    couponCode: code && !couponError ? code : null,
    couponError,
  };
}
