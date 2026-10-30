import 'server-only';
import { createClient } from './supabase/server';

export type CartLine = {
  id: string;
  quantity: number;
  variantId: string;
  size: string;
  stock: number;
  productId: string;
  slug: string;
  name: string;
  priceCents: number;
  weightGrams: number;
  image: string | null;
  active: boolean;
};

type Raw = {
  id: string;
  quantity: number;
  variant: {
    id: string;
    size: string;
    stock: number;
    product: {
      id: string;
      slug: string;
      name: string;
      price_cents: number;
      weight_grams: number;
      active: boolean;
      images: { path: string; position: number }[];
    } | null;
  } | null;
};

const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

export async function getCart(userId: string): Promise<CartLine[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('cart_items')
    .select(
      'id, quantity, variant:product_variants(id, size, stock, product:products(id, slug, name, price_cents, weight_grams, active, images:product_images(path, position)))',
    )
    .eq('user_id', userId)
    .order('created_at');

  const lines: CartLine[] = [];
  for (const row of (data ?? []) as unknown as Raw[]) {
    const variant = one(row.variant);
    const product = variant ? one(variant.product) : null;
    if (!variant || !product) continue;
    const img = [...(product.images ?? [])].sort((a, b) => a.position - b.position)[0]?.path ?? null;
    lines.push({
      id: row.id,
      quantity: row.quantity,
      variantId: variant.id,
      size: variant.size,
      stock: variant.stock,
      productId: product.id,
      slug: product.slug,
      name: product.name,
      priceCents: product.price_cents,
      weightGrams: product.weight_grams,
      image: img,
      active: product.active,
    });
  }
  return lines;
}

export const cartTotals = (lines: CartLine[]) => ({
  subtotalCents: lines.reduce((s, l) => s + l.priceCents * l.quantity, 0),
  weightGrams: lines.reduce((s, l) => s + l.weightGrams * l.quantity, 0),
  count: lines.reduce((s, l) => s + l.quantity, 0),
});
