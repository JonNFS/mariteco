'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';

export function MobileMenu({ links, loggedIn }: { links: { href: string; label: string }[]; loggedIn: boolean }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button className="btn btn-ghost btn-icon !px-2.5 !py-2.5" onClick={() => setOpen(true)} aria-label="Abrir menu" aria-expanded={open}>
        <Menu className="h-6 w-6" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Menu">
          <button className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" onClick={() => setOpen(false)} aria-label="Fechar menu" />
          <div className="absolute left-0 top-0 flex h-full w-[82%] max-w-sm animate-pop flex-col gap-2 rounded-r-4xl bg-cream p-6 shadow-soft">
            <div className="mb-4 flex items-center justify-between">
              <span className="gradient-text font-display text-2xl font-bold">Mariteco</span>
              <button className="btn btn-ghost !p-2" onClick={() => setOpen(false)} aria-label="Fechar">
                <X className="h-6 w-6" />
              </button>
            </div>
            {[{ href: '/loja', label: 'Todos os produtos' }, ...links].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-2xl px-4 py-3 font-display text-lg font-semibold text-ink-700 transition hover:translate-x-1 hover:bg-pink-100 hover:text-pink-600"
              >
                {l.label}
              </Link>
            ))}
            <div className="mt-auto grid gap-2">
              <Link href={loggedIn ? '/conta' : '/entrar'} onClick={() => setOpen(false)} className="btn btn-blue">
                {loggedIn ? 'Minha conta' : 'Entrar / Criar conta'}
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
