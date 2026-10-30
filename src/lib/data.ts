import 'server-only';
import { createClient } from './supabase/server';
import { isSupabaseConfigured } from './supabase/config';
import { DEMO_CATEGORIES, DEMO_PRODUCTS } from './demo-products';
import type { Category, ProductFull } from './types';

const PRODUCT_SELECT =
  'id, slug, name, description, price_cents, compare_at_cents, gender, size_type, weight_grams, featured, created_at, ' +
  'category:categories(name, slug), images:product_images(path, position), variants:product_variants(id, size, stock)';

type Row = Omit<ProductFull, 'category'> & { category: ProductFull['category'] | ProductFull['category'][] };

function normalize(row: Row): ProductFull {
  const category = Array.isArray(row.category) ? (row.category[0] ?? null) : row.category;
  return {
    ...row,
    category,
    images: [...(row.images ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
    variants: row.variants ?? [],
  };
}

export const inStock = (p: ProductFull) => p.variants.some((v) => v.stock > 0);

export async function getCategories(): Promise<Category[]> {
  if (!isSupabaseConfigured) return DEMO_CATEGORIES;
  const supabase = await createClient();
  const { data } = await supabase.from('categories').select('id, name, slug').order('sort_order');
  return data ?? [];
}

export type ProductFilters = {
  category?: string;
  gender?: string;
  size?: string;
  q?: string;
  sort?: string;
  featured?: boolean;
  limit?: number;
};

export async function getProducts(f: ProductFilters = {}): Promise<ProductFull[]> {
  let list: ProductFull[];

  if (!isSupabaseConfigured) {
    list = [...DEMO_PRODUCTS];
    if (f.category) list = list.filter((p) => p.category?.slug === f.category);
    if (f.gender) list = list.filter((p) => p.gender === f.gender || p.gender === 'unissex');
    if (f.q) list = list.filter((p) => p.name.toLowerCase().includes(f.q!.toLowerCase()));
    if (f.featured) list = list.filter((p) => p.featured);
  } else {
    const supabase = await createClient();
    let query = supabase.from('products').select(PRODUCT_SELECT).eq('active', true);

    if (f.category) {
      const { data: cat } = await supabase.from('categories').select('id').eq('slug', f.category).maybeSingle();
      if (!cat) return [];
      query = query.eq('category_id', cat.id);
    }
    if (f.gender === 'menina' || f.gender === 'menino') query = query.in('gender', [f.gender, 'unissex']);
    if (f.featured) query = query.eq('featured', true);
    if (f.q) {
      const safe = f.q.replace(/[%_,()*\\]/g, ' ').trim().slice(0, 60);
      if (safe) query = query.ilike('name', `%${safe}%`);
    }
    const { data, error } = await query.order('created_at', { ascending: false }).limit(200);
    if (error) {
      console.error('getProducts', error.message);
      return [];
    }
    list = ((data ?? []) as unknown as Row[]).map(normalize);
  }

  if (f.size) list = list.filter((p) => p.variants.some((v) => v.size === f.size && v.stock > 0));

  switch (f.sort) {
    case 'menor-preco':
      list.sort((a, b) => a.price_cents - b.price_cents);
      break;
    case 'maior-preco':
      list.sort((a, b) => b.price_cents - a.price_cents);
      break;
    default:
      list.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  }
  return f.limit ? list.slice(0, f.limit) : list;
}

export async function getProductBySlug(slug: string): Promise<ProductFull | null> {
  if (!isSupabaseConfigured) return DEMO_PRODUCTS.find((p) => p.slug === slug) ?? null;
  const supabase = await createClient();
  const { data } = await supabase.from('products').select(PRODUCT_SELECT).eq('slug', slug).eq('active', true).maybeSingle();
  return data ? normalize(data as unknown as Row) : null;
}

export async function getCartCount(userId: string | undefined): Promise<number> {
  if (!userId || !isSupabaseConfigured) return 0;
  const supabase = await createClient();
  const { data } = await supabase.from('cart_items').select('quantity').eq('user_id', userId);
  return (data ?? []).reduce((n, r) => n + r.quantity, 0);
}
