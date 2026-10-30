import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ChevronRight, ShieldCheck, Truck } from 'lucide-react';
import { BuyBox } from '@/components/BuyBox';
import { ProductGallery } from '@/components/ProductGallery';
import { ProductCard } from '@/components/ProductCard';
import { WhatsAppIcon } from '@/components/icons';
import { Blob } from '@/components/Decor';
import { getProductBySlug, getProducts } from '@/lib/data';
import { getUser } from '@/lib/auth';
import { brl, productImageUrl, sortSizes, whatsappLink } from '@/lib/utils';
import { SITE } from '@/lib/constants';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) return { title: 'Produto não encontrado' };
  return {
    title: p.name,
    description: p.description.slice(0, 160) || `${p.name} na ${SITE.name}`,
    openGraph: { images: p.images[0] ? [productImageUrl(p.images[0].path)] : undefined },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const user = await getUser();
  const variants = sortSizes(product.variants);
  const related = (await getProducts({ category: product.category?.slug, limit: 5 })).filter((p) => p.id !== product.id).slice(0, 4);
  const discount = product.compare_at_cents ? Math.round((1 - product.price_cents / product.compare_at_cents) * 100) : 0;
  const sizeLabel = product.size_type === 'calcado' ? 'Numeração' : 'Tamanho';

  return (
    <div className="relative overflow-hidden">
      <Blob tone="sky" className="-right-24 -top-10 h-96 w-96" />
      <div className="container-page py-8 sm:py-12">
        <nav aria-label="Você está em" className="mb-6 flex flex-wrap items-center gap-1 text-sm font-semibold text-ink-500">
          <Link href="/" className="hover:text-pink-600">Início</Link><ChevronRight className="h-4 w-4" />
          <Link href="/loja" className="hover:text-pink-600">Loja</Link>
          {product.category && (<><ChevronRight className="h-4 w-4" /><Link href={`/loja?categoria=${product.category.slug}`} className="hover:text-pink-600">{product.category.name}</Link></>)}
          <ChevronRight className="h-4 w-4" /><span className="text-ink-900">{product.name}</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
          <ProductGallery images={product.images.map((i) => i.path)} name={product.name} />

          <div className="reveal">
            <div className="flex flex-wrap gap-2">
              {product.category && <span className="chip !bg-sky-100 !text-sky-600">{product.category.name}</span>}
              <span className="chip">{product.gender === 'menina' ? 'Menina' : product.gender === 'menino' ? 'Menino' : 'Unissex'}</span>
            </div>
            <h1 className="mt-3 font-display text-3xl font-bold leading-tight text-ink-900 sm:text-4xl">{product.name}</h1>

            <div className="mt-4 flex flex-wrap items-end gap-3">
              <span className="font-display text-4xl font-bold text-pink-600">{brl(product.price_cents)}</span>
              {product.compare_at_cents && (
                <>
                  <span className="pb-1 text-lg text-ink-300 line-through">{brl(product.compare_at_cents)}</span>
                  <span className="mb-1 rounded-full bg-pink-500 px-3 py-1 font-display text-sm font-bold text-white">-{discount}%</span>
                </>
              )}
            </div>

            {product.description && <p className="mt-5 whitespace-pre-line leading-relaxed text-ink-700">{product.description}</p>}

            <div className="mt-8">
              <BuyBox
                productId={product.id}
                slug={product.slug}
                priceCents={product.price_cents}
                variants={variants}
                loggedIn={Boolean(user)}
                sizeLabel={sizeLabel}
              />
            </div>

            <ul className="mt-8 grid gap-3 text-sm font-semibold text-ink-700 sm:grid-cols-2">
              <li className="flex items-center gap-2 rounded-2xl bg-white p-3 shadow-soft ring-1 ring-ink-100"><Truck className="h-5 w-5 text-sky-500" /> Enviamos para todo o Brasil</li>
              <li className="flex items-center gap-2 rounded-2xl bg-white p-3 shadow-soft ring-1 ring-ink-100"><ShieldCheck className="h-5 w-5 text-pink-500" /> Atendimento direto com a loja</li>
            </ul>

            <a
              href={whatsappLink(`Olá! Tenho uma dúvida sobre "${product.name}" (${SITE.url}/produto/${product.slug}) 💙`)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-whatsapp btn-icon mt-6 w-full sm:w-auto"
            >
              <WhatsAppIcon className="h-5 w-5" /> Tirar dúvidas no WhatsApp
            </a>
          </div>
        </div>

        {related.length > 0 && (
          <section className="mt-20">
            <h2 className="text-center font-display text-3xl font-bold">Você também vai amar 💖</h2>
            <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
              {related.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
