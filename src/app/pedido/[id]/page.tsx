import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PartyPopper } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { PaymentPanel } from '@/components/PaymentPanel';
import { formatDateBR } from '@/lib/delivery';
import { ORDER_STATUS } from '@/lib/constants';
import { brl, productImageUrl, uuidOk } from '@/lib/utils';

export const metadata: Metadata = { title: 'Pedido', robots: { index: false } };

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser(`/pedido/${id}`);
  if (!uuidOk(id)) notFound();

  const supabase = await createClient();
  // RLS garante: só o dono (ou admin) enxerga o pedido.
  const { data: order } = await supabase
    .from('orders')
    .select('*, items:order_items(id, name, size, image_path, unit_price_cents, quantity)')
    .eq('id', id)
    .maybeSingle();
  if (!order) notFound();

  const st = ORDER_STATUS[order.status] ?? { label: order.status, tone: 'bg-ink-100 text-ink-500' };
  const a = order.address as Record<string, string | null>;

  return (
    <div className="container-page max-w-3xl py-10 sm:py-14">
      <div className="card animate-pop p-6 text-center sm:p-10">
        <PartyPopper className="mx-auto h-14 w-14 animate-wiggle text-pink-500" />
        <h1 className="mt-4 font-display text-4xl font-bold">{order.status === 'aguardando_pagamento' ? `Pedido #${order.number} reservado!` : `Pedido #${order.number} confirmado!`}</h1>
        <p className="mt-2 text-ink-700">{order.status === 'aguardando_pagamento' ? 'Falta só o pagamento 💖' : 'Obrigada pelo carinho 💖 Já estamos preparando tudo.'}</p>
        <span className={`mt-4 inline-block rounded-full px-4 py-1.5 font-display text-sm font-bold ${st.tone}`}>{st.label}</span>

        {order.status === 'aguardando_pagamento' && order.payment_status !== 'rejected' && order.payment_status !== 'expired' && (
          <PaymentPanel
            orderId={order.id}
            method={order.payment_method}
            pixCode={order.pix_qr_code}
            pixQrBase64={order.pix_qr_base64}
            boletoUrl={order.boleto_url}
            boletoLine={order.boleto_line}
            expiresAt={order.payment_expires_at}
          />
        )}
        {order.status === 'aguardando_pagamento' && ['rejected', 'expired'].includes(order.payment_status) && (
          <div className="mx-auto mt-6 max-w-md rounded-3xl bg-pink-50 p-5 text-sm text-pink-800">
            <p className="font-bold">O pagamento não foi concluído</p>
            <p className="mt-1">Seus itens ainda estão reservados por pouco tempo. Volte à sacola para tentar de novo.</p>
            <Link href="/sacola" className="btn btn-primary btn-sm mt-3">Tentar novamente</Link>
          </div>
        )}
      </div>

      <div className="card mt-6 space-y-4 p-6">
        <h2 className="font-display text-2xl font-bold">Itens</h2>
        <ul className="divide-y divide-pink-100">
          {order.items.map((it: { id: string; name: string; size: string; image_path: string | null; unit_price_cents: number; quantity: number }) => (
            <li key={it.id} className="flex items-center gap-4 py-3">
              <span className="relative h-16 w-14 shrink-0 overflow-hidden rounded-2xl bg-pink-50"><Image src={productImageUrl(it.image_path)} alt="" fill sizes="56px" className="object-cover" /></span>
              <div className="flex-1"><p className="font-display font-semibold">{it.name}</p><p className="text-sm text-ink-500">Tam. {it.size} · {it.quantity}x {brl(it.unit_price_cents)}</p></div>
              <strong>{brl(it.unit_price_cents * it.quantity)}</strong>
            </li>
          ))}
        </ul>
        <div className="space-y-1 border-t border-dashed border-pink-200 pt-4">
          <div className="flex justify-between"><span>Produtos</span><span>{brl(order.subtotal_cents)}</span></div>
          <div className="flex justify-between"><span>Frete ({order.shipping_name})</span><span>{order.shipping_cents === 0 ? 'Grátis' : brl(order.shipping_cents)}</span></div>
          {order.gift_fee_cents > 0 && <div className="flex justify-between"><span>Embalagem de presente</span><span>{brl(order.gift_fee_cents)}</span></div>}
          {order.discount_cents > 0 && <div className="flex justify-between text-emerald-600"><span>Cupom {order.coupon_code}</span><span>− {brl(order.discount_cents)}</span></div>}
          <div className="flex justify-between font-display text-2xl font-bold"><span>Total</span><span className="text-pink-600">{brl(order.total_cents)}</span></div>
        </div>
      </div>

      <div className="card mt-6 p-6">
        <h2 className="font-display text-2xl font-bold">Entrega</h2>
        <p className="mt-2 text-ink-700">
          {a.recipient}<br />
          {a.street}, {a.number}{a.complement ? ` – ${a.complement}` : ''} · {a.neighborhood}<br />
          {a.city}/{a.state} · CEP {a.cep}
        </p>
        {order.estimated_delivery && <p className="mt-3 rounded-2xl bg-sky-50 p-3 text-sm font-bold text-sky-800">📦 Previsão de entrega: {formatDateBR(order.estimated_delivery)}</p>}
        {order.is_gift && (
          <p className="mt-3 rounded-2xl bg-pink-50 p-3 text-sm text-pink-800">🎁 <strong>Presente</strong> — De: {order.gift_from} · Para: {order.gift_to}{order.gift_message ? <><br />“{order.gift_message}”</> : null}</p>
        )}
        {order.tracking_code && <p className="mt-3 rounded-2xl bg-mint-100 p-3 text-sm font-bold text-emerald-700">Código de rastreio: {order.tracking_code}</p>}
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/conta" className="btn btn-soft">Meus pedidos</Link>
        <Link href="/loja" className="btn btn-primary">Continuar comprando</Link>
      </div>
    </div>
  );
}
