import Link from 'next/link';
import { Boxes, ClipboardList, DollarSign, Hourglass, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { brl } from '@/lib/utils';

export default async function AdminHome() {
  const supabase = await createClient();
  const [products, awaiting, orders, paid] = await Promise.all([
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('active', true),
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'aguardando_pagamento'),
    supabase.from('orders').select('id', { count: 'exact', head: true }),
    supabase.from('orders').select('total_cents').in('status', ['pago', 'em_separacao', 'enviado', 'entregue']),
  ]);
  const revenue = (paid.data ?? []).reduce((s, o) => s + o.total_cents, 0);

  const cards = [
    { label: 'Produtos ativos', value: String(products.count ?? 0), icon: Boxes, tone: 'from-pink-100 to-pink-50 text-pink-600' },
    { label: 'Aguardando pagamento', value: String(awaiting.count ?? 0), icon: Hourglass, tone: 'from-sun-100 to-white text-amber-600' },
    { label: 'Pedidos no total', value: String(orders.count ?? 0), icon: ClipboardList, tone: 'from-sky-100 to-sky-50 text-sky-600' },
    { label: 'Vendas confirmadas', value: brl(revenue), icon: DollarSign, tone: 'from-mint-100 to-white text-emerald-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold">Resumo da loja</h1>
        <Link href="/admin/produtos/novo" className="btn btn-primary btn-icon"><Plus className="h-5 w-5" /> Novo produto</Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className={`card bg-gradient-to-br p-5 transition hover:-translate-y-1 ${tone}`}>
            <Icon className="h-7 w-7" />
            <p className="mt-3 font-display text-3xl font-bold text-ink-900">{value}</p>
            <p className="text-sm font-semibold text-ink-500">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
