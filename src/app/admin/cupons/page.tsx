import Link from 'next/link';
import { Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { CouponRowActions } from '@/components/admin/CouponRowActions';
import { brl } from '@/lib/utils';

function describe(c: { discount_type: string; value: number; max_discount_cents: number | null }) {
  if (c.discount_type === 'percent') return `${c.value}%${c.max_discount_cents ? ` (até ${brl(c.max_discount_cents)})` : ''}`;
  if (c.discount_type === 'fixed') return brl(c.value);
  return 'Frete grátis';
}

export default async function AdminCoupons() {
  const supabase = await createClient();
  const { data } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
  const now = Date.now();
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold">Cupons de desconto</h1>
        <Link href="/admin/cupons/novo" className="btn btn-primary btn-icon"><Plus className="h-5 w-5" /> Novo cupom</Link>
      </div>
      {!data?.length && <div className="card p-10 text-center text-ink-500">Nenhum cupom ainda. Crie o primeiro! 🎟️</div>}
      <ul className="space-y-3">
        {data?.map((c) => {
          const expired = c.expires_at && new Date(c.expires_at).getTime() <= now;
          const notStarted = c.starts_at && new Date(c.starts_at).getTime() > now;
          const exhausted = c.max_uses !== null && c.uses_count >= c.max_uses;
          const state = !c.active ? ['Desativado', 'bg-ink-100 text-ink-500'] : expired ? ['Expirado', 'bg-ink-100 text-ink-500'] : exhausted ? ['Esgotado', 'bg-ink-100 text-ink-500'] : notStarted ? ['Agendado', 'bg-sun-100 text-amber-700'] : ['Ativo', 'bg-mint-100 text-emerald-700'];
          return (
            <li key={c.id} className="card flex flex-wrap items-center gap-3 p-4">
              <span className="rounded-2xl bg-pink-50 px-3 py-1.5 font-mono text-lg font-bold text-pink-600">{c.code}</span>
              <div className="min-w-40 flex-1 text-sm">
                <p className="font-bold">{describe(c)}{c.min_subtotal_cents > 0 && <span className="font-normal text-ink-500"> · mínimo {brl(c.min_subtotal_cents)}</span>}</p>
                <p className="text-ink-500">
                  {c.uses_count}{c.max_uses !== null ? `/${c.max_uses}` : ''} usos · {c.expires_at ? `expira ${new Date(c.expires_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}` : 'sem validade'}
                  {c.description ? ` · ${c.description}` : ''}
                </p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${state[1]}`}>{state[0]}</span>
              <CouponRowActions id={c.id} active={c.active} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
