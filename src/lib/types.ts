export type Gender = 'menina' | 'menino' | 'unissex';
export type SizeType = 'roupa' | 'calcado' | 'unico';

export type ProductFull = {
  id: string;
  slug: string;
  name: string;
  description: string;
  price_cents: number;
  compare_at_cents: number | null;
  gender: Gender;
  size_type: SizeType;
  weight_grams: number;
  featured: boolean;
  created_at: string;
  category: { name: string; slug: string } | null;
  images: { path: string; position?: number }[];
  variants: { id: string; size: string; stock: number }[];
};

export type Category = { id: string; name: string; slug: string };
