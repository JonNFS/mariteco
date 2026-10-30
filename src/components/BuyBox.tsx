'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2, Lock, Minus, Plus, ShoppingBag, Truck, Zap } from 'lucide-react';
import { addToCart } from '@/app/actions/cart';
import { brl, cn, formatCep, onlyDigits } from '@/lib/utils';

type Variant = { id: string; size: string; stock: number };
type Option = { id: string; name: string; description: string; priceCents: number; days: number };
type ShipResult = { address: { city: string; state: string; street: string; neighborhood: string }; options: Option[] };

/** Soma dias úteis (seg–sex) a partir de hoje. */
function addBusinessDays(days: number) {
  const d = new Date();
  let left = days;
  while (left > 0) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) left--;
  }
  return d;
}
const fmt = (d: Date) => d.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' }).replace('.', '');

function arrival(o: Option) {
  if (o.id === 'retirada') return 'Pronto para retirar amanhã';
  const from = Math.max(1, o.days - 2);
  return from >= o.days ? `Chegará ${fmt(addBusinessDays(o.days))}` : `Chegará entre ${fmt(addBusinessDays(from))} e ${fmt(addBusinessDays(o.days))}`;
}

export function BuyBox({
  productId,
  slug,
  priceCents,
  variants,
  loggedIn,
  sizeLabel,
}: {
  productId: string;
  slug: string;
  priceCents: number;
  variants: Variant[];
  loggedIn: boolean;
  sizeLabel: string;
}) {
  const router = useRouter();
  const [variantId, setVariantId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [cep, setCep] = useState('');
  const [ship, setShip] = useState<ShipResult | null>(null);
  const [shipError, setShipError] = useState('');
  const [shipLoading, setShipLoading] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const selected = variants.find((v) => v.id === variantId);
  const maxQty = Math.min(selected?.stock ?? 1, 10);
  const loginUrl = (motivo: string) => `/entrar?next=${encodeURIComponent(`/produto/${slug}`)}&motivo=${motivo}`;

  async function calcShipping() {
    // Calcular frete exige login
    if (!loggedIn) return router.push(loginUrl('frete'));
    setShipError('');
    setShip(null);
    if (onlyDigits(cep).length !== 8) return setShipError('Digite um CEP com 8 números.');
    setShipLoading(true);
    try {
      const res = await fetch('/api/frete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cep: onlyDigits(cep), productId, quantity: qty }),
      });
      const data = await res.json();
      if (res.status === 401) return router.push(loginUrl('frete'));
      if (!res.ok) return setShipError(data.error ?? 'Não foi possível calcular.');
      if (!data.options?.length) return setShipError('Ainda não entregamos neste CEP. Fale com a gente no WhatsApp!');
      setShip(data);
    } catch {
      setShipError('Falha de conexão. Tente novamente.');
    } finally {
      setShipLoading(false);
    }
  }

  function buy(goToCheckout: boolean) {
    // Comprar exige login
    if (!loggedIn) return router.push(loginUrl('compra'));
    if (!variantId) return setMsg({ tone: 'err', text: `Escolha um ${sizeLabel.toLowerCase()} primeiro 💖` });
    setMsg(null);
    startTransition(async () => {
      const r = await addToCart(variantId, qty);
      if (!r.ok) {
        if (r.needsLogin) return router.push(loginUrl('compra'));
        return setMsg({ tone: 'err', text: r.error });
      }
      if (goToCheckout) router.push('/checkout');
      else {
        setMsg({ tone: 'ok', text: 'Adicionado à sacola! 🛍️' });
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* tamanhos */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="font-display text-base font-bold text-ink-900">{sizeLabel}: <span className="text-pink-600">{selected?.size ?? 'escolha'}</span></span>
        </div>
        <div className="flex flex-wrap gap-2">
          {variants.map((v) => (
            <button
              key={v.id}
              type="button"
              disabled={v.stock < 1}
              data-active={v.id === variantId}
              onClick={() => { setVariantId(v.id); setQty(1); setMsg(null); }}
              className="size-pill"
              title={v.stock < 1 ? 'Esgotado' : v.stock <= 2 ? `Últimas ${v.stock} unidades` : undefined}
            >
              {v.size}
            </button>
          ))}
        </div>
        {selected && selected.stock <= 3 && <p className="mt-2 animate-pop text-sm font-bold text-pink-600">🔥 Últimas {selected.stock} unidades neste tamanho!</p>}
      </div>

      {/* quantidade */}
      <div className="flex items-center gap-4">
        <span className="font-display text-base font-bold text-ink-900">Quantidade</span>
        <div className="flex items-center rounded-full bg-white p-1 shadow-soft ring-2 ring-ink-100">
          <button type="button" className="btn btn-ghost !p-2" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Diminuir"><Minus className="h-4 w-4" /></button>
          <span className="w-8 text-center font-display text-lg font-bold" aria-live="polite">{qty}</span>
          <button type="button" className="btn btn-ghost !p-2" onClick={() => setQty((q) => Math.min(maxQty, q + 1))} aria-label="Aumentar"><Plus className="h-4 w-4" /></button>
        </div>
        <span className="ml-auto font-display text-lg font-bold text-ink-900">{brl(priceCents * qty)}</span>
      </div>

      {/* ações */}
      <div className="grid gap-3 sm:grid-cols-2">
        <button className="btn btn-primary btn-lg btn-icon" disabled={pending} onClick={() => buy(true)}>
          {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5" />} Comprar agora
        </button>
        <button className="btn btn-blue btn-lg btn-icon" disabled={pending} onClick={() => buy(false)}>
          <ShoppingBag className="h-5 w-5" /> Adicionar à sacola
        </button>
      </div>
      {!loggedIn && (
        <p className="flex items-center gap-2 text-sm text-ink-500"><Lock className="h-4 w-4 text-sky-500" /> Para comprar, você entra ou cria sua conta rapidinho.</p>
      )}
      {msg && (
        <p role="status" className={cn('animate-pop rounded-2xl px-4 py-3 text-sm font-bold', msg.tone === 'ok' ? 'bg-mint-100 text-emerald-700' : 'bg-pink-100 text-pink-700')}>
          {msg.tone === 'ok' && <Check className="mr-1 inline h-4 w-4" />}{msg.text}
        </p>
      )}

      {/* frete */}
      <div className="rounded-3xl border-2 border-dashed border-sky-200 bg-sky-50/60 p-4">
        <p className="mb-3 flex items-center gap-2 font-display text-base font-bold text-ink-900"><Truck className="h-5 w-5 text-sky-500" /> Calcule o prazo e o valor da entrega</p>
        <form onSubmit={(e) => { e.preventDefault(); calcShipping(); }} className="flex gap-2">
          <input
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder="Digite seu CEP"
            value={cep}
            maxLength={9}
            onChange={(e) => setCep(formatCep(e.target.value))}
            onFocus={() => { if (!loggedIn) router.push(loginUrl('frete')); }}
            className="input !py-2.5"
            aria-label="CEP"
          />
          <button className="btn btn-blue btn-sm shrink-0" disabled={shipLoading}>
            {shipLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Calcular'}
          </button>
        </form>
        <a href="https://buscacepinter.correios.com.br/app/endereco/index.php" target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs font-bold text-sky-600 underline">Não sei meu CEP</a>
        {shipError && <p role="alert" className="mt-2 text-sm font-bold text-pink-600">{shipError}</p>}

        {ship && (
          <div className="mt-4 animate-pop space-y-2">
            <p className="text-sm text-ink-700">Enviar para <strong>{ship.address.city ? `${ship.address.city} – ${ship.address.state}` : ship.address.state}</strong>{ship.address.neighborhood && <> · {ship.address.neighborhood}</>}</p>
            {ship.options.map((o) => (
              <div key={o.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white p-3 shadow-soft ring-1 ring-ink-100">
                <div>
                  <p className="font-display font-semibold text-ink-900">{o.name}</p>
                  <p className="text-sm font-bold text-emerald-600">{arrival(o)}</p>
                  <p className="text-xs text-ink-500">{o.description}</p>
                </div>
                <p className={cn('shrink-0 font-display text-lg font-bold', o.priceCents === 0 ? 'text-emerald-600' : 'text-ink-900')}>
                  {o.priceCents === 0 ? 'Grátis' : brl(o.priceCents)}
                </p>
              </div>
            ))}
            <p className="text-xs text-ink-500">Valores e prazos estimados. O frete final é confirmado no checkout.</p>
          </div>
        )}
      </div>
    </div>
  );
}
