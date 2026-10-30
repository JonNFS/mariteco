import { createClient } from '@/lib/supabase/server';
import { OrderStatusForm } from '@/components/admin/OrderStatusForm';
import { WhatsAppSendButton } from '@/components/admin/WhatsAppSendButton';
import { formatDateBR } from '@/lib/delivery';
import { ORDER_STATUS } from '@/lib/constants';
import { brl, whatsappLink } from '@/lib/utils';

type Item = { id: string; name: string; size: string; quantity: number; unit_price_cents: number };

export default async function AdminOrders() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('orders')
    .select('id, number, status, total_cents, shipping_cents, shipping_name, tracking_code, created_at, address, payment_method, payment_status, installments, discount_cents, coupon_code, gift_fee_cents, is_gift, gift_from, gift_to, gift_message, estimated_delivery, items:order_items(id, name, size, quantity, unit_price_cents)')
    .order('created_at', { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">Pedidos</h1>
      {!data?.length && <div className="card p-10 text-center text-ink-500">Nenhum pedido ainda.</div>}
      <ul className="space-y-3">
        {data?.map((o) => {
          const st = ORDER_STATUS[o.status] ?? { label: o.status, tone: 'bg-ink-100 text-ink-500' };
          const a = o.address as Record<string, string | null>;
          const wa = a.phone ? `https://wa.me/${a.phone.startsWith('55') ? a.phone : `55${a.phone}`}?text=${encodeURIComponent(`Olá, ${a.recipient}! Sobre o seu pedido #${o.number} na Mariteco 💙`)}` : whatsappLink();
          return (
            <li key={o.id}>
              <details className="card group p-5 open:ring-2 open:ring-pink-200">
                <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3">
                  <span className="font-display text-lg font-bold">#{o.number}</span>
                  <span className="flex-1 truncate text-ink-700">{a.recipient} · {a.city}/{a.state}</span>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${st.tone}`}>{st.label}</span>
                  <strong className="font-display text-lg text-pink-600">{brl(o.total_cents)}</strong>
                </summary>
                <div className="mt-5 space-y-4 border-t border-dashed border-pink-200 pt-5">
                  <p className="text-sm text-ink-500">{new Date(o.created_at).toLocaleString('pt-BR')}</p>
                  <ul className="space-y-1 text-sm">
                    {(o.items as Item[]).map((i) => <li key={i.id}>{i.quantity}x <strong>{i.name}</strong> · tam. {i.size} · {brl(i.unit_price_cents)}</li>)}
                  </ul>
                  <p className="text-sm text-ink-700">
                    <strong>Entrega ({o.shipping_name} · {o.shipping_cents === 0 ? 'grátis' : brl(o.shipping_cents)}):</strong><br />
                    {a.recipient} · {a.phone}<br />
                    {a.street}, {a.number}{a.complement ? ` – ${a.complement}` : ''} · {a.neighborhood} · {a.city}/{a.state} · CEP {a.cep}
                  </p>
                  <p className="text-sm text-ink-700">
                    <strong>Pagamento:</strong> {({ pix: 'Pix', credit_card: 'Cartão de crédito', boleto: 'Boleto' } as Record<string, string>)[o.payment_method ?? ''] ?? 'ainda não escolhido'}
                    {o.installments ? ` em ${o.installments}x` : ''} · {({ pending: 'pendente', approved: 'aprovado', rejected: 'recusado', expired: 'expirado', cancelled: 'cancelado', refunded: 'reembolsado' } as Record<string, string>)[o.payment_status] ?? o.payment_status}
                    {o.coupon_code ? ` · cupom ${o.coupon_code} (− ${brl(o.discount_cents)})` : ''}
                    {o.estimated_delivery ? ` · previsão ${formatDateBR(o.estimated_delivery)}` : ''}
                  </p>
                  {o.is_gift && (
                    <p className="rounded-2xl bg-pink-50 p-3 text-sm text-pink-800">🎁 <strong>EMBALAR PARA PRESENTE</strong>{o.gift_fee_cents > 0 ? ` (${brl(o.gift_fee_cents)})` : ''} · De: <strong>{o.gift_from}</strong> · Para: <strong>{o.gift_to}</strong>{o.gift_message ? <><br />Recado: “{o.gift_message}”</> : null}</p>
                  )}
                  {o.status === 'cancelado' && o.payment_status === 'approved' && (
                    <p className="rounded-2xl bg-sun-100 p-3 text-sm font-bold text-amber-800">⚠ Pedido cancelado com pagamento aprovado: faça o reembolso no painel do Mercado Pago.</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-soft btn-sm">Conversar com o cliente</a>
                    <WhatsAppSendButton orderId={o.id} status={o.status} />
                  </div>
                  <OrderStatusForm id={o.id} status={o.status} tracking={o.tracking_code ?? ''} />
                </div>
              </details>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
