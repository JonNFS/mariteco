'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Trash2 } from 'lucide-react';
import { deleteProduct, setProductActive } from '@/app/actions/admin';

export function ProductRowActions({ id, active, slug }: { id: string; active: boolean; slug: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState('');

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) setError(r.error ?? 'Erro');
      else router.refresh();
    });

  return (
    <div className="flex items-center gap-1">
      {active && <Link href={`/produto/${slug}`} target="_blank" className="btn btn-ghost btn-sm !p-2" aria-label="Ver na loja" title="Ver na loja"><Eye className="h-4 w-4" /></Link>}
      <button className="btn btn-ghost btn-sm !p-2" disabled={pending} onClick={() => run(() => setProductActive(id, !active))} aria-label={active ? 'Ocultar da loja' : 'Mostrar na loja'} title={active ? 'Ocultar da loja' : 'Mostrar na loja'}>
        {active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
      <button
        className="btn btn-ghost btn-sm !p-2 text-pink-600"
        disabled={pending}
        onClick={() => { if (confirm('Excluir este produto e suas imagens? Isso não pode ser desfeito. (Para só tirar da loja, use o olhinho.)')) run(() => deleteProduct(id)); }}
        aria-label="Excluir"
        title="Excluir"
      >
        <Trash2 className="h-4 w-4" />
      </button>
      {error && <span role="alert" className="text-xs font-bold text-pink-600">{error}</span>}
    </div>
  );
}
