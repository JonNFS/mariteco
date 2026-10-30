'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Power, Trash2 } from 'lucide-react';
import { deleteCoupon, setCouponActive } from '@/app/actions/admin';

export function CouponRowActions({ id, active }: { id: string; active: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState('');
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => { const r = await fn(); if (!r.ok) setError(r.error ?? 'Erro'); else router.refresh(); });
  return (
    <div className="flex items-center gap-1">
      <Link href={`/admin/cupons/${id}`} className="btn btn-ghost btn-sm !p-2" aria-label="Editar" title="Editar"><Pencil className="h-4 w-4" /></Link>
      <button className="btn btn-ghost btn-sm !p-2" disabled={pending} onClick={() => run(() => setCouponActive(id, !active))} aria-label={active ? 'Desativar' : 'Ativar'} title={active ? 'Desativar' : 'Ativar'}>
        <Power className={`h-4 w-4 ${active ? 'text-emerald-600' : 'text-ink-300'}`} />
      </button>
      <button className="btn btn-ghost btn-sm !p-2 text-pink-600" disabled={pending} aria-label="Excluir" title="Excluir"
        onClick={() => { if (confirm('Excluir este cupom? Pedidos antigos continuam guardando o código usado.')) run(() => deleteCoupon(id)); }}>
        <Trash2 className="h-4 w-4" />
      </button>
      {error && <span role="alert" className="text-xs font-bold text-pink-600">{error}</span>}
    </div>
  );
}
