import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { CheckoutFlow } from '@/components/CheckoutFlow';
import { getProfile, requireUser } from '@/lib/auth';
import { cartTotals, getCart } from '@/lib/cart';
import { getSettings } from '@/lib/settings';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Finalizar compra', robots: { index: false } };

export const dynamic = 'force-dynamic';

export default async function CheckoutPage() {
  const user = await requireUser('/checkout');
  const lines = await getCart(user.id);
  if (lines.length === 0) redirect('/sacola');
  if (lines.some((l) => !l.active || l.stock < l.quantity)) redirect('/sacola');

  const [profile, supabase, settings] = [await getProfile(), await createClient(), await getSettings()];
  const { data: addr } = await supabase.from('addresses').select('*').order('created_at', { ascending: false }).limit(1).maybeSingle();
  const { subtotalCents, count } = cartTotals(lines);

  return (
    <div className="container-page py-10 sm:py-14">
      <h1 className="font-display text-4xl font-bold">Finalizar compra</h1>
      <p className="mb-8 mt-1 text-ink-500">Compra facilitada, sem complicações: são só 3 passinhos 💖</p>
      <CheckoutFlow
        subtotalCents={subtotalCents}
        itemCount={count}
        email={user.email ?? ''}
        publicKey={process.env.NEXT_PUBLIC_MP_PUBLIC_KEY ?? ''}
        maxInstallments={settings.maxInstallments}
        giftPriceCents={settings.giftWrapPriceCents}
        pixMinutes={settings.pixExpirationMinutes}
        boletoDays={settings.boletoExpirationDays}
        defaults={{
          recipient: addr?.recipient ?? profile?.full_name ?? '',
          phone: profile?.phone ?? '',
          cep: addr?.cep ? `${addr.cep.slice(0, 5)}-${addr.cep.slice(5)}` : '',
          street: addr?.street ?? '',
          number: addr?.number ?? '',
          complement: addr?.complement ?? '',
          neighborhood: addr?.neighborhood ?? '',
          city: addr?.city ?? '',
          state: addr?.state ?? '',
        }}
      />
    </div>
  );
}
