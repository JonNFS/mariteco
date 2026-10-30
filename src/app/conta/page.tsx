import Link from 'next/link';
import type { Metadata } from 'next';
import { ChevronRight, PackageSearch } from 'lucide-react';
import { ProfileForm } from '@/components/ProfileForm';
import { getProfile, requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { ORDER_STATUS } from '@/lib/constants';
import { brl } from '@/lib/utils';
import { logout } from '@/app/actions/auth';

export const metadata: Metadata = { title: 'Minha conta', robots: { index: false } };

export default async function AccountPage() {
  const user = await requireUser('/conta');
  const profile = await getProfile();
  const supabase = await createClient();
  const { data: orders } = await supabase
    .from('orders')
    .select('id, number, status, total_cents, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <div className="container-page py-10 sm:py-14">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl font-bold">Olá{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}! 👋</h1>
          <p className="text-ink-500">Aqui você acompanha seus pedidos e atualiza seus dados.</p>
        </div>
        <form action={logout}><button className="btn btn-soft btn-sm">Sair da conta</button></form>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_24rem]">
        <section className="card p-6">
          <h2 className="font-display text-2xl font-bold">Meus pedidos</h2>
          {!orders?.length ? (
            <div className="py-10 text-center">
              <PackageSearch className="mx-auto h-12 w-12 text-pink-300" />
              <p className="mt-3 text-ink-500">Você ainda não fez nenhum pedido.</p>
              <Link href="/loja" className="btn btn-primary mt-5">Ver a loja</Link>
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {orders.map((o) => {
                const st = ORDER_STATUS[o.status] ?? { label: o.status, tone: 'bg-ink-100 text-ink-500' };
                return (
                  <li key={o.id}>
                    <Link href={`/pedido/${o.id}`} className="group flex items-center gap-4 rounded-3xl border-2 border-ink-100 p-4 transition-all hover:-translate-y-0.5 hover:border-pink-300 hover:shadow-soft">
                      <div className="flex-1">
                        <p className="font-display text-lg font-semibold">Pedido #{o.number}</p>
                        <p className="text-sm text-ink-500">{new Date(o.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                      </div>
                      <span className={`hidden rounded-full px-3 py-1 text-xs font-bold sm:inline ${st.tone}`}>{st.label}</span>
                      <strong className="font-display text-lg text-pink-600">{brl(o.total_cents)}</strong>
                      <ChevronRight className="h-5 w-5 text-ink-300 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="card h-fit p-6">
          <h2 className="mb-4 font-display text-2xl font-bold">Meus dados</h2>
          <ProfileForm name={profile?.full_name ?? ''} phone={profile?.phone ?? ''} email={user.email ?? ''} />
        </section>
      </div>
    </div>
  );
}
