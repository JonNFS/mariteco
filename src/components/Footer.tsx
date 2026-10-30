import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Phone } from 'lucide-react';
import { SITE } from '@/lib/constants';
import { whatsappLink } from '@/lib/utils';
import { InstagramIcon, TikTokIcon, WhatsAppIcon } from './icons';

export function Footer() {
  const a = SITE.address;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${a.line1}, ${a.neighborhood}, ${a.city} ${a.state}, ${a.cep}`)}`;

  return (
    <footer className="relative mt-24 overflow-hidden bg-ink-900 text-ink-100">
      <div className="h-3 bg-gradient-to-r from-pink-400 via-sun-300 to-sky-400" />
      <div className="container-page grid gap-10 py-14 md:grid-cols-4">
        <div className="md:col-span-1">
          <Image src="/brand/logo-wordmark.png" alt="Mariteco" width={384} height={85} className="h-12 w-auto rounded-2xl bg-white/95 p-2" />
          <p className="mt-4 text-sm leading-relaxed text-ink-300">{SITE.tagline}. Moda infantil com carinho para meninas e meninos.</p>
          <div className="mt-5 flex gap-3">
            <a href={SITE.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram da Mariteco" className="btn btn-icon !rounded-2xl bg-white/10 !p-3 text-white hover:bg-pink-500">
              <InstagramIcon className="h-5 w-5" />
            </a>
            <a href={SITE.tiktok} target="_blank" rel="noopener noreferrer" aria-label="TikTok da Mariteco" className="btn btn-icon !rounded-2xl bg-white/10 !p-3 text-white hover:bg-sky-500">
              <TikTokIcon className="h-5 w-5" />
            </a>
            <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp da Mariteco" className="btn btn-icon !rounded-2xl bg-white/10 !p-3 text-white hover:bg-[#25D366]">
              <WhatsAppIcon className="h-5 w-5" />
            </a>
          </div>
        </div>

        <div>
          <h3 className="font-display text-lg font-semibold text-white">Loja</h3>
          <ul className="mt-4 space-y-2 text-sm">
            {[['/loja', 'Todos os produtos'], ['/loja?genero=menina', 'Meninas'], ['/loja?genero=menino', 'Meninos'], ['/loja?categoria=calcados', 'Calçados'], ['/loja?categoria=acessorios', 'Acessórios']].map(([h, l]) => (
              <li key={h}><Link href={h} className="transition hover:translate-x-1 hover:text-pink-300 inline-block">{l}</Link></li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="font-display text-lg font-semibold text-white">Minha conta</h3>
          <ul className="mt-4 space-y-2 text-sm">
            {[['/entrar', 'Entrar'], ['/entrar?aba=cadastro', 'Criar conta'], ['/conta', 'Meus pedidos'], ['/sacola', 'Sacola']].map(([h, l]) => (
              <li key={h}><Link href={h} className="transition hover:translate-x-1 hover:text-sky-300 inline-block">{l}</Link></li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="font-display text-lg font-semibold text-white">Venha nos visitar</h3>
          <address className="mt-4 space-y-3 text-sm not-italic text-ink-300">
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="flex gap-2 transition hover:text-white">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-pink-300" />
              <span>{a.line1}, {a.neighborhood}<br />{a.city} – {a.state}, CEP {a.cep}</span>
            </a>
            <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 transition hover:text-white">
              <Phone className="h-4 w-4 shrink-0 text-sky-300" /> {SITE.phoneDisplay}
            </a>
          </address>
        </div>
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs text-ink-300">
        <div className="mb-2 flex justify-center gap-4">
          <Link href="/privacidade" className="underline-offset-2 hover:text-white hover:underline">Política de Privacidade</Link>
          <Link href="/termos" className="underline-offset-2 hover:text-white hover:underline">Termos de compra</Link>
        </div>
        © {new Date().getFullYear()} Mariteco · Feito com carinho em Maceió 💙
      </div>
    </footer>
  );
}
