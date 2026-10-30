import { notFound } from 'next/navigation';
import { ProductForm } from '@/components/admin/ProductForm';
import { getCategories } from '@/lib/data';
import { createClient } from '@/lib/supabase/server';
import { sortSizes, uuidOk } from '@/lib/utils';

export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuidOk(id)) notFound();
  const supabase = await createClient();
  const [{ data: p }, categories] = await Promise.all([
    supabase
      .from('products')
      .select('id, name, description, category_id, gender, size_type, price_cents, compare_at_cents, weight_grams, active, featured, images:product_images(path, position), variants:product_variants(size, stock)')
      .eq('id', id)
      .maybeSingle(),
    getCategories(),
  ]);
  if (!p) notFound();

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">Editar produto</h1>
      <ProductForm
        categories={categories}
        initial={{
          id: p.id,
          name: p.name,
          description: p.description,
          categoryId: p.category_id,
          gender: p.gender,
          sizeType: p.size_type,
          priceCents: p.price_cents,
          compareAtCents: p.compare_at_cents,
          weightGrams: p.weight_grams,
          active: p.active,
          featured: p.featured,
          variants: sortSizes(p.variants ?? []),
          images: [...(p.images ?? [])].sort((a, b) => a.position - b.position).map((i) => i.path),
        }}
      />
    </div>
  );
}
