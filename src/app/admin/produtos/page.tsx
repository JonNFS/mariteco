import Link from 'next/link';
import { Pencil, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { ProductRowActions } from '@/components/admin/ProductRowActions';
import { brl, productImageUrl } from '@/lib/utils';

type Row = {
  id: string; slug: string; name: string; price_cents: number; active: boolean; featured: boolean;
  images: { path: string; position: number }[]; variants: { size: string; stock: number }[];
  category: { name: string } | { name: string }[] | null;
};

export default async function AdminProducts() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('products')
    .select('id, slug, name, price_cents, active, featured, category:categories(name), images:product_images(path, position), variants:product_variants(size, stock)')
    .order('created_at', { ascending: false });
  const rows = (data ?? []) as unknown as Row[];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold">Produtos <span className="text-pink-500">({rows.length})</span></h1>
        <Link href="/admin/produtos/novo" className="btn btn-primary btn-icon"><Plus className="h-5 w-5" /> Novo produto</Link>
      </div>

      {rows.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="font-display text-2xl font-bold">Nenhum produto ainda</p>
          <p className="mt-1 text-ink-500">Cadastre o primeiro com fotos, preço e tamanhos.</p>
          <Link href="/admin/produtos/novo" className="btn btn-primary mt-5">Cadastrar produto</Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((p) => {
            const cover = [...p.images].sort((a, b) => a.position - b.position)[0]?.path;
            const stock = p.variants.reduce((s, v) => s + v.stock, 0);
            const cat = Array.isArray(p.category) ? p.category[0] : p.category;
            return (
              <li key={p.id} className="card flex flex-wrap items-center gap-4 p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={productImageUrl(cover)} alt="" className="h-20 w-16 rounded-2xl bg-pink-50 object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-lg font-semibold">{p.name}</p>
                  <p className="text-sm text-ink-500">{cat?.name ?? 'Sem categoria'} · {p.variants.length} tamanhos · {stock} em estoque</p>
                  <div className="mt-1 flex gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${p.active ? 'bg-mint-100 text-emerald-700' : 'bg-ink-100 text-ink-500'}`}>{p.active ? 'Ativo' : 'Oculto'}</span>
                    {p.featured && <span className="rounded-full bg-sun-100 px-2.5 py-0.5 text-xs font-bold text-amber-700">Destaque</span>}
                  </div>
                </div>
                <strong className="font-display text-xl text-pink-600">{brl(p.price_cents)}</strong>
                <div className="flex items-center gap-2">
                  <Link href={`/admin/produtos/${p.id}`} className="btn btn-soft btn-icon btn-sm"><Pencil className="h-4 w-4" /> Editar</Link>
                  <ProductRowActions id={p.id} active={p.active} slug={p.slug} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
