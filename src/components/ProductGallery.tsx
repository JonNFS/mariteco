'use client';

import Image from 'next/image';
import { useState } from 'react';
import { cn, productImageUrl } from '@/lib/utils';

export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const [active, setActive] = useState(0);
  const list = images.length ? images : [''];

  return (
    <div className={cn('grid gap-4', list.length > 1 && 'sm:grid-cols-[5rem_1fr]')}>
      {list.length > 1 && (
        <div className="order-2 flex gap-3 sm:order-1 sm:flex-col">
          {list.map((p, i) => (
            <button
              key={p + i}
              onClick={() => setActive(i)}
              aria-label={`Ver foto ${i + 1}`}
              className={cn(
                'relative aspect-square w-16 shrink-0 overflow-hidden rounded-2xl ring-2 transition-all hover:-translate-y-0.5 sm:w-full',
                i === active ? 'ring-pink-500 shadow-candy' : 'ring-ink-100 opacity-70 hover:opacity-100',
              )}
            >
              <Image src={productImageUrl(p)} alt="" fill sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
      <div className="group relative order-1 aspect-[3/4] overflow-hidden rounded-[2.5rem] bg-pink-50 shadow-soft ring-4 ring-white sm:order-2">
        <Image
          key={active}
          src={productImageUrl(list[active])}
          alt={name}
          fill
          priority
          sizes="(min-width:1024px) 45vw, 100vw"
          className="animate-pop object-cover transition-transform duration-700 group-hover:scale-105"
        />
      </div>
    </div>
  );
}
