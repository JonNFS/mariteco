import { ProductForm } from '@/components/admin/ProductForm';
import { getCategories } from '@/lib/data';

export default async function NewProduct() {
  const categories = await getCategories();
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">Novo produto</h1>
      <ProductForm
        categories={categories}
        initial={{ name: '', description: '', categoryId: null, gender: 'menina', sizeType: 'roupa', priceCents: null, compareAtCents: null, weightGrams: 300, active: true, featured: false, variants: [], images: [] }}
      />
    </div>
  );
}
