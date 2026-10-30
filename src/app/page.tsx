import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Gift, MapPin, MessageCircle, Truck } from 'lucide-react';
import { Blob, Sparkle, Squiggle } from '@/components/Decor';
import { ProductCard } from '@/components/ProductCard';
import { InstagramIcon, TikTokIcon, WhatsAppIcon } from '@/components/icons';
import { getProducts } from '@/lib/data';
import { SITE } from '@/lib/constants';
import { whatsappLink } from '@/lib/utils';

const CATEGORY_CARDS = [
  { href: '/loja?genero=menina', title: 'Meninas', sub: 'Laços, babados e cor', img: '/demo/conjunto-cerejas-marinho.webp', tone: 'from-pink-300 to-pink-100', text: 'text-pink-700' },
  { href: '/loja?genero=menino', title: 'Meninos', sub: 'Conforto pra brincar', img: '/demo/shorts-tactel.webp', tone: 'from-sky-300 to-sky-100', text: 'text-sky-700' },
  { href: '/loja?categoria=calcados', title: 'Calçados', sub: 'Pezinhos felizes', img: '/demo/sandalia-coracao-glitter.webp', tone: 'from-sun-300 to-sun-100', text: 'text-amber-700' },
  { href: '/loja?categoria=acessorios', title: 'Acessórios', sub: 'O toque final', img: '/demo/conjunto-frutas-coloridas.webp', tone: 'from-mint-300 to-mint-100', text: 'text-emerald-700' },
];

const MARQUEE = ['Enviamos para todo o Brasil', 'Vestindo alegria, pureza e amor', 'Loja física em Maceió – AL', 'Atendimento pelo WhatsApp', 'Moda para meninas e meninos', 'Presente cheio de carinho'];

export default async function HomePage() {
  let featured = await getProducts({ featured: true, limit: 4 });
  if (featured.length === 0) featured = await getProducts({ limit: 4 });
  const newest = await getProducts({ limit: 8 });

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <Blob tone="pink" className="-left-24 -top-16 h-[28rem] w-[28rem] animate-floatSlow" />
        <Blob tone="sky" className="-right-20 top-10 h-[30rem] w-[30rem] animate-floatSlow [animation-delay:-4s]" />
        <Sparkle className="left-[8%] top-24 h-6 w-6 animate-float text-sun-500" />
        <Sparkle className="right-[12%] top-12 h-5 w-5 animate-float text-pink-400 [animation-delay:-2s]" />
        <Sparkle className="bottom-24 left-[46%] h-4 w-4 animate-float text-sky-400 [animation-delay:-3s]" />

        <div className="container-page grid items-center gap-10 py-12 lg:grid-cols-2 lg:py-20">
          <div className="reveal">
            <span className="chip animate-pop !bg-sky-100 !text-sky-600">💙 Moda infantil · Maceió – AL</span>
            <h1 className="mt-5 font-display text-5xl font-bold leading-[1.05] text-ink-900 sm:text-6xl xl:text-7xl">
              Vestindo <span className="gradient-text">alegria</span>,<br />
              pureza e <span className="relative inline-block text-sky-500">amor<Squiggle className="absolute -bottom-3 left-0 h-3 w-full text-pink-300" /></span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-700">
              Roupinhas, calçados e acessórios cheios de carinho para meninas e meninos. Escolha a peça, o tamanho e receba em casa — <strong>enviamos para todo o Brasil</strong>.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/loja" className="btn btn-primary btn-lg btn-icon">
                Ver novidades <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp btn-lg btn-icon">
                <WhatsAppIcon className="h-5 w-5" /> Chamar no WhatsApp
              </a>
            </div>

            <ul className="mt-10 grid max-w-xl gap-3 sm:grid-cols-3">
              {[
                [Truck, 'Envio para todo o Brasil'],
                [MessageCircle, 'Atendimento no WhatsApp'],
                [MapPin, 'Loja física em Maceió'],
              ].map(([Icon, label], i) => {
                const I = Icon as typeof Truck;
                return (
                  <li key={i} className="flex items-center gap-3 rounded-3xl bg-white/80 p-3 text-sm font-bold text-ink-700 shadow-soft ring-1 ring-pink-100 backdrop-blur transition hover:-translate-y-1">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-100 to-sky-100 text-pink-500"><I className="h-5 w-5" /></span>
                    {label as string}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* colagem */}
          <div className="relative mx-auto grid w-full max-w-lg grid-cols-2 gap-4 sm:gap-5">
            <div className="relative aspect-[3/4] translate-y-8 animate-float overflow-hidden rounded-[2.5rem] rounded-tl-[6rem] bg-pink-100 shadow-candy ring-4 ring-white">
              <Image src="/demo/conjunto-cerejas-marinho.webp" alt="Conjunto de cerejinhas com sapatilhas" fill priority sizes="(min-width:1024px) 22vw, 45vw" className="object-cover" />
            </div>
            <div className="relative aspect-[3/4] animate-float overflow-hidden rounded-[2.5rem] rounded-br-[6rem] bg-sky-100 shadow-pop ring-4 ring-white [animation-delay:-3s]">
              <Image src="/demo/conjunto-frutas-coloridas.webp" alt="Conjunto de frutinhas coloridas" fill priority sizes="(min-width:1024px) 22vw, 45vw" className="object-cover" />
            </div>
            <div className="absolute -bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white px-5 py-3 font-display text-sm font-semibold text-ink-700 shadow-soft ring-2 ring-pink-200">
              <Gift className="h-5 w-5 text-pink-500" /> Um presente cheio de carinho
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIAS */}
      <section className="container-page py-16">
        <SectionTitle kicker="Escolha o estilo" title="Compre por categoria" />
        <div className="mt-10 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
          {CATEGORY_CARDS.map((c, i) => (
            <Link key={c.href} href={c.href} className="reveal group relative aspect-[4/5] overflow-hidden rounded-[2.5rem] shadow-soft ring-4 ring-white transition-all duration-300 hover:-translate-y-2 hover:rotate-1" style={{ animationDelay: `${i * 90}ms` }}>
              <div className={`absolute inset-0 bg-gradient-to-b ${c.tone}`} />
              <Image src={c.img} alt="" fill sizes="(min-width:1024px) 22vw, 45vw" className="object-cover transition-transform duration-700 group-hover:scale-110" />
              <div className="absolute inset-x-3 bottom-3 rounded-3xl bg-white/90 p-3 text-center backdrop-blur transition-transform duration-300 group-hover:-translate-y-1">
                <h3 className={`font-display text-xl font-bold ${c.text}`}>{c.title}</h3>
                <p className="text-xs font-semibold text-ink-500">{c.sub}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* DESTAQUES */}
      {featured.length > 0 && (
        <section className="container-page py-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionTitle kicker="As queridinhas" title="Destaques da semana" align="left" />
            <Link href="/loja" className="btn btn-soft btn-icon btn-sm">Ver tudo <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {featured.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
          </div>
        </section>
      )}

      {/* SOBRE */}
      <section className="container-page py-16">
        <div className="relative grid items-center gap-10 overflow-hidden rounded-[3rem] bg-gradient-to-br from-pink-100 via-white to-sky-100 p-6 shadow-soft ring-1 ring-pink-100 sm:p-10 lg:grid-cols-2 lg:p-14">
          <Sparkle className="right-10 top-8 h-7 w-7 animate-float text-sun-500" />
          <div className="relative mx-auto aspect-[4/5] w-full max-w-sm rotate-[-3deg] overflow-hidden rounded-[2.5rem] ring-8 ring-white shadow-candy transition-transform duration-500 hover:rotate-0">
            <Image src="/demo/sacolas-mariteco.webp" alt="Sacolas de presente da Mariteco" fill sizes="(min-width:1024px) 30vw, 80vw" className="object-cover" />
          </div>
          <div>
            <span className="chip">Nossa história</span>
            <h2 className="mt-4 font-display text-4xl font-bold text-ink-900 sm:text-5xl">Um presente <span className="gradient-text">cheio de carinho</span></h2>
            <p className="mt-5 text-lg leading-relaxed text-ink-700">
              A Mariteco nasceu para vestir a infância com alegria, pureza e amor. Cada peça é escolhida com cuidado, pensando no conforto de quem brinca e na emoção de quem presenteia — e vai para casa em uma embalagem feita para encantar.
            </p>
            <p className="mt-4 flex items-start gap-2 text-ink-700">
              <MapPin className="mt-1 h-5 w-5 shrink-0 text-pink-500" />
              <span>{SITE.address.line1}, {SITE.address.neighborhood} — {SITE.address.city}/{SITE.address.state}. Vem! Vamos te atender.</span>
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href={whatsappLink('Olá! Gostaria de visitar a loja da Mariteco 💙')} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp btn-icon">
                <WhatsAppIcon className="h-5 w-5" /> Falar com a gente
              </a>
              <Link href="/loja" className="btn btn-soft">Conhecer a loja online</Link>
            </div>
          </div>
        </div>
      </section>

      {/* NOVIDADES */}
      {newest.length > 4 && (
        <section className="container-page py-8">
          <SectionTitle kicker="Acabou de chegar" title="Novidades" />
          <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {newest.slice(4, 8).map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
          </div>
        </section>
      )}

      {/* SOCIAL */}
      <section className="container-page py-16">
        <div className="relative overflow-hidden rounded-[3rem] bg-ink-900 p-8 text-center text-white sm:p-14">
          <Blob tone="pink" className="-left-10 -top-10 h-72 w-72 !opacity-30" />
          <Blob tone="sky" className="-bottom-16 -right-10 h-80 w-80 !opacity-30" />
          <h2 className="font-display text-3xl font-bold sm:text-5xl">Acompanhe a <span className="text-pink-300">Mari</span><span className="text-sky-300">teco</span> 💖</h2>
          <p className="mx-auto mt-4 max-w-xl text-ink-100">Novidades, looks e bastidores todos os dias nas nossas redes {SITE.handle}.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <a href={SITE.instagram} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-lg btn-icon"><InstagramIcon className="h-6 w-6" /> Instagram</a>
            <a href={SITE.tiktok} target="_blank" rel="noopener noreferrer" className="btn btn-blue btn-lg btn-icon"><TikTokIcon className="h-6 w-6" /> TikTok</a>
          </div>
        </div>
      </section>

      {/* FAIXA (final da página) */}
      <div className="mt-4 overflow-hidden border-y-2 border-dashed border-pink-200 bg-white/70 py-3" aria-hidden>
        <div className="flex w-max animate-marquee gap-10 whitespace-nowrap font-display text-lg font-semibold text-pink-500">
          {[...MARQUEE, ...MARQUEE].map((t, i) => (
            <span key={i} className="flex items-center gap-10">{t}<Sparkle className="!static h-4 w-4 text-sky-400" /></span>
          ))}
        </div>
      </div>
    </>
  );
}

function SectionTitle({ kicker, title, align = 'center' }: { kicker: string; title: string; align?: 'center' | 'left' }) {
  return (
    <div className={align === 'center' ? 'text-center' : ''}>
      <span className="chip !bg-sky-100 !text-sky-600">{kicker}</span>
      <h2 className="mt-3 font-display text-3xl font-bold text-ink-900 sm:text-4xl">{title}</h2>
    </div>
  );
}
