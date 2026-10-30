import Link from 'next/link';
import type { Metadata } from 'next';
import { SearchX } from 'lucide-react';
import { ProductCard } from '@/components/ProductCard';
import { Blob } from '@/components/Decor';
import { getCategories, getProducts } from '@/lib/data';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Loja', description: 'Roupas, calçados e acessórios infantis da Mariteco.' };

type SP = { categoria?: string; genero?: string; tamanho?: string; q?: string; ordem?: string };

const SORTS = [
  { v: '', l: 'Novidades' },
  { v: 'menor-preco', l: 'Menor preço' },
  { v: 'maior-preco', l: 'Maior preço' },
];
const SIZES = ['RN', 'P', 'M', 'G', '2', '4', '6', '8', '10', '12', '14', '16', '24', '26', '28', '30', '32'];

function Chip({ href, active, children }: { href: string; active?: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      scroll={false}
      className={cn(
        'rounded-full border-2 px-4 py-1.5 font-display text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5',
        active ? 'border-pink-500 bg-pink-500 text-white shadow-candy' : 'border-ink-100 bg-white text-ink-700 hover:border-sky-400 hover:text-sky-600',
      )}
    >
      {children}
    </Link>
  );
}

export default async function ShopPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const [products, categories] = await Promise.all([
    getProducts({ category: sp.categoria, gender: sp.genero, size: sp.tamanho, q: sp.q, sort: sp.ordem }),
    getCategories(),
  ]);

  const href = (patch: Partial<SP>) => {
    const next: Record<string, string | undefined> = { ...sp, ...patch };
    const qs = new URLSearchParams();
    Object.entries(next).forEach(([k, v]) => v && qs.set(k, v));
    const s = qs.toString();
    return s ? `/loja?${s}` : '/loja';
  };
  const hasFilter = Boolean(sp.categoria || sp.genero || sp.tamanho || sp.q);

  const title = sp.q ? `Busca: “${sp.q.slice(0, 60)}”` : sp.genero === 'menina' ? 'Meninas' : sp.genero === 'menino' ? 'Meninos' : categories.find((c) => c.slug === sp.categoria)?.name ?? 'Todos os produtos';

  return (
    <div className="relative overflow-hidden">
      <Blob tone="pink" className="-left-24 -top-24 h-96 w-96" />
      <Blob tone="sky" className="-right-24 top-10 h-96 w-96" />
      <div className="container-page py-10 sm:py-14">
        <div className="text-center">
          <span className="chip !bg-sky-100 !text-sky-600">Loja</span>
          <h1 className="mt-3 font-display text-4xl font-bold text-ink-900 sm:text-5xl">{title}</h1>
          <p className="mt-2 text-ink-500">{products.length} {products.length === 1 ? 'produto' : 'produtos'}</p>
        </div>

        <div className="card mt-8 space-y-4 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 font-display text-sm font-bold text-ink-500">Para</span>
            <Chip href={href({ genero: undefined })} active={!sp.genero}>Todos</Chip>
            <Chip href={href({ genero: 'menina' })} active={sp.genero === 'menina'}>Meninas</Chip>
            <Chip href={href({ genero: 'menino' })} active={sp.genero === 'menino'}>Meninos</Chip>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 font-display text-sm font-bold text-ink-500">Categoria</span>
            <Chip href={href({ categoria: undefined })} active={!sp.categoria}>Todas</Chip>
            {categories.map((c) => (
              <Chip key={c.id} href={href({ categoria: c.slug })} active={sp.categoria === c.slug}>{c.name}</Chip>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 font-display text-sm font-bold text-ink-500">Tamanho</span>
            <Chip href={href({ tamanho: undefined })} active={!sp.tamanho}>Todos</Chip>
            {SIZES.map((s) => (
              <Chip key={s} href={href({ tamanho: s })} active={sp.tamanho === s}>{s}</Chip>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-pink-200 pt-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 font-display text-sm font-bold text-ink-500">Ordenar</span>
              {SORTS.map((s) => (
                <Chip key={s.v} href={href({ ordem: s.v || undefined })} active={(sp.ordem ?? '') === s.v}>{s.l}</Chip>
              ))}
            </div>
            {hasFilter && <Link href="/loja" className="link-underline text-sm font-bold text-pink-600">Limpar filtros</Link>}
          </div>
        </div>

        {products.length === 0 ? (
          <div className="card mx-auto mt-10 max-w-md p-10 text-center">
            <SearchX className="mx-auto h-12 w-12 text-pink-300" />
            <h2 className="mt-4 font-display text-2xl font-bold">Nada por aqui ainda…</h2>
            <p className="mt-2 text-ink-500">Tente outros filtros ou fale com a gente no WhatsApp — podemos separar algo especial pra você.</p>
            <Link href="/loja" className="btn btn-primary mt-6">Ver todos os produtos</Link>
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {products.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
          </div>
        )}
      </div>
    </div>
  );
}
