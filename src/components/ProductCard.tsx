import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { brl, cn, productImageUrl } from '@/lib/utils';
import type { ProductFull } from '@/lib/types';

const GENDER_TONE = { menina: 'bg-pink-100 text-pink-600', menino: 'bg-sky-100 text-sky-600', unissex: 'bg-sun-100 text-amber-700' } as const;
const GENDER_LABEL = { menina: 'Menina', menino: 'Menino', unissex: 'Unissex' } as const;

export function ProductCard({ product, index = 0 }: { product: ProductFull; index?: number }) {
  const soldOut = !product.variants.some((v) => v.stock > 0);
  const discount = product.compare_at_cents
    ? Math.round((1 - product.price_cents / product.compare_at_cents) * 100)
    : 0;
  const sizes = product.variants.filter((v) => v.stock > 0).map((v) => v.size);

  return (
    <Link
      href={`/produto/${product.slug}`}
      className="reveal group relative flex flex-col overflow-hidden rounded-4xl bg-white shadow-soft ring-1 ring-ink-100 transition-all duration-300 hover:-translate-y-2 hover:rotate-[.4deg] hover:shadow-[0_24px_50px_-16px_rgba(242,82,143,.35)] hover:ring-pink-300"
      style={{ animationDelay: `${Math.min(index, 8) * 70}ms` }}
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-pink-50">
        <Image
          src={productImageUrl(product.images[0]?.path)}
          alt={product.name}
          fill
          sizes="(min-width:1024px) 25vw, (min-width:640px) 33vw, 50vw"
          className={cn('object-cover transition-transform duration-700 group-hover:scale-110', soldOut && 'opacity-60 grayscale')}
        />
        <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
          {discount > 0 && !soldOut && (
            <span className="animate-pop rounded-full bg-pink-500 px-3 py-1 font-display text-xs font-bold text-white shadow-candy">-{discount}%</span>
          )}
          {soldOut && <span className="rounded-full bg-ink-900 px-3 py-1 font-display text-xs font-bold text-white">Esgotado</span>}
        </div>
        <span className={cn('absolute right-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-extrabold', GENDER_TONE[product.gender])}>
          {GENDER_LABEL[product.gender]}
        </span>
        <span className="absolute inset-x-3 bottom-3 flex translate-y-4 items-center justify-center gap-2 rounded-full bg-white/95 py-2.5 font-display text-sm font-semibold text-pink-600 opacity-0 shadow-soft backdrop-blur transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          Ver detalhes <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        {product.category && <span className="text-xs font-bold uppercase tracking-wide text-sky-500">{product.category.name}</span>}
        <h3 className="line-clamp-2 font-display text-base font-semibold leading-snug text-ink-900 sm:text-lg">{product.name}</h3>
        <div className="mt-auto pt-1">
          {product.compare_at_cents && <span className="mr-2 text-sm text-ink-300 line-through">{brl(product.compare_at_cents)}</span>}
          <span className="font-display text-xl font-bold text-pink-600">{brl(product.price_cents)}</span>
        </div>
        {sizes.length > 0 && (
          <p className="truncate text-xs text-ink-500">Tam.: {sizes.slice(0, 6).join(' · ')}{sizes.length > 6 ? '…' : ''}</p>
        )}
      </div>
    </Link>
  );
}
