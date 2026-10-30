'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { saveCoupon } from '@/app/actions/admin';

export type CouponInitial = {
  id?: string; code: string; description: string; discountType: 'percent' | 'fixed' | 'free_shipping'; value: number;
  minSubtotalCents: number; maxDiscountCents: number | null; maxUses: number | null; maxUsesPerUser: number | null;
  startsAt: string; expiresAt: string; active: boolean; // datas já no formato do input datetime-local (Brasília)
};

const money = (c: number | null) => (c === null ? '' : (c / 100).toFixed(2).replace('.', ','));
function cents(s: string): number | null {
  const clean = s.trim().replace(/[R$\s]/g, '');
  if (!clean) return null;
  const n = Number(clean.includes(',') ? clean.replace(/\./g, '').replace(',', '.') : clean);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}
const intOrNull = (s: string) => (s.trim() === '' ? null : Math.round(Number(s)));

export function CouponForm({ initial }: { initial: CouponInitial }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState('');
  const [f, setF] = useState({
    code: initial.code, description: initial.description, type: initial.discountType,
    value: initial.discountType === 'percent' ? String(initial.value || '') : money(initial.value || null),
    min: money(initial.minSubtotalCents || null), maxDisc: money(initial.maxDiscountCents),
    maxUses: initial.maxUses === null ? '' : String(initial.maxUses),
    perUser: initial.maxUsesPerUser === null ? '' : String(initial.maxUsesPerUser),
    startsAt: initial.startsAt, expiresAt: initial.expiresAt, active: initial.active,
  });
  const up = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF((p) => ({ ...p, [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const value = f.type === 'percent' ? Math.round(Number(f.value)) : f.type === 'fixed' ? cents(f.value) ?? 0 : 0;
    start(async () => {
      const r = await saveCoupon({
        id: initial.id, code: f.code, description: f.description, discountType: f.type, value,
        minSubtotalCents: cents(f.min) ?? 0, maxDiscountCents: cents(f.maxDisc),
        maxUses: intOrNull(f.maxUses), maxUsesPerUser: intOrNull(f.perUser),
        startsAt: f.startsAt || null, expiresAt: f.expiresAt || null, active: f.active,
      });
      if (!r.ok) setError(r.error); else { router.push('/admin/cupons'); router.refresh(); }
    });
  }

  return (
    <form onSubmit={submit} className="card grid gap-4 p-6 sm:grid-cols-2">
      <div>
        <label className="label" htmlFor="c-code">Código do cupom</label>
        <input id="c-code" value={f.code} onChange={(e) => setF((p) => ({ ...p, code: e.target.value.toUpperCase().replace(/\s/g, '') }))} required maxLength={32} className="input uppercase" placeholder="BEMVINDA10" />
      </div>
      <div>
        <label className="label" htmlFor="c-type">Tipo de desconto</label>
        <select id="c-type" value={f.type} onChange={up('type')} className="input">
          <option value="percent">Porcentagem (%)</option>
          <option value="fixed">Valor fixo (R$)</option>
          <option value="free_shipping">Frete grátis</option>
        </select>
      </div>
      {f.type !== 'free_shipping' && (
        <div>
          <label className="label" htmlFor="c-value">{f.type === 'percent' ? 'Porcentagem (1 a 100)' : 'Valor do desconto (R$)'}</label>
          <input id="c-value" value={f.value} onChange={up('value')} required inputMode="decimal" className="input" placeholder={f.type === 'percent' ? '10' : '15,00'} />
        </div>
      )}
      {f.type === 'percent' && (
        <div>
          <label className="label" htmlFor="c-max">Desconto máximo (R$) <span className="font-normal text-ink-300">(opcional)</span></label>
          <input id="c-max" value={f.maxDisc} onChange={up('maxDisc')} inputMode="decimal" className="input" placeholder="Sem limite" />
        </div>
      )}
      <div>
        <label className="label" htmlFor="c-min">Pedido mínimo (R$) <span className="font-normal text-ink-300">(opcional)</span></label>
        <input id="c-min" value={f.min} onChange={up('min')} inputMode="decimal" className="input" placeholder="Sem mínimo" />
      </div>
      <div>
        <label className="label" htmlFor="c-uses">Limite total de usos <span className="font-normal text-ink-300">(vazio = ilimitado)</span></label>
        <input id="c-uses" value={f.maxUses} onChange={up('maxUses')} inputMode="numeric" className="input" placeholder="Ilimitado" />
      </div>
      <div>
        <label className="label" htmlFor="c-user">Usos por cliente <span className="font-normal text-ink-300">(vazio = ilimitado)</span></label>
        <input id="c-user" value={f.perUser} onChange={up('perUser')} inputMode="numeric" className="input" placeholder="Ilimitado" />
      </div>
      <div>
        <label className="label" htmlFor="c-start">Começa em <span className="font-normal text-ink-300">(vazio = já vale)</span></label>
        <input id="c-start" type="datetime-local" value={f.startsAt} onChange={up('startsAt')} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="c-end">Expira em <span className="font-normal text-ink-300">(vazio = não expira)</span></label>
        <input id="c-end" type="datetime-local" value={f.expiresAt} onChange={up('expiresAt')} className="input" />
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="c-desc">Descrição interna <span className="font-normal text-ink-300">(só você vê)</span></label>
        <input id="c-desc" value={f.description} onChange={up('description')} maxLength={120} className="input" placeholder="Ex.: Campanha Dia das Crianças" />
      </div>
      <label className="flex cursor-pointer items-center gap-3 sm:col-span-2">
        <input type="checkbox" checked={f.active} onChange={up('active')} className="h-5 w-5 accent-pink-500" /> <span className="font-bold">Cupom ativo</span>
      </label>
      {error && <p role="alert" className="rounded-2xl bg-pink-100 px-4 py-3 text-sm font-bold text-pink-700 sm:col-span-2">{error}</p>}
      <div className="flex gap-3 sm:col-span-2">
        <button className="btn btn-primary" disabled={pending}>{pending ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Salvar cupom'}</button>
        <button type="button" className="btn btn-soft" onClick={() => router.push('/admin/cupons')}>Cancelar</button>
      </div>
    </form>
  );
}
