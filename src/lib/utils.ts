import clsx, { type ClassValue } from 'clsx';
import { SITE } from './constants';

export const cn = (...inputs: ClassValue[]) => clsx(inputs);

export const brl = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const onlyDigits = (s: string) => s.replace(/\D/g, '');

export const formatCep = (s: string) => {
  const d = onlyDigits(s).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
};

export const slugify = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

/** Evita open-redirect: só aceita caminhos internos (ex.: "/produto/abc"). */
export function safeNext(next: unknown, fallback = '/'): string {
  if (typeof next !== 'string') return fallback;
  if (!next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return fallback;
  if (/[\r\n]/.test(next)) return fallback;
  return next;
}

export function whatsappLink(message = 'Olá! Vim pelo site da Mariteco e gostaria de ajuda 💙') {
  return `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(message)}`;
}

export function productImageUrl(path: string | null | undefined): string {
  if (!path) return '/brand/logo-full.png';
  if (path.startsWith('/')) return path; // fotos de exemplo em /public
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return `${base}/storage/v1/object/public/product-images/${path}`;
}

/** Ordena tamanhos: RN, P, M, G... antes; depois números crescentes. */
const WORD_ORDER = ['RN', 'PP', 'P', 'M', 'G', 'GG', 'ÚNICO', 'UNICO'];
export function sortSizes<T extends { size: string }>(list: T[]): T[] {
  const score = (s: string) => {
    const up = s.toUpperCase();
    const w = WORD_ORDER.indexOf(up);
    if (w >= 0) return w;
    const n = parseFloat(up);
    return Number.isNaN(n) ? 999 : 100 + n;
  };
  return [...list].sort((a, b) => score(a.size) - score(b.size) || a.size.localeCompare(b.size));
}

export const uuidOk = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
