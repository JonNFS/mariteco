'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { Loader2, MapPin, Truck } from 'lucide-react';
import { placeOrder, type CheckoutState } from '@/app/actions/checkout';
import { brl, cn, formatCep, onlyDigits } from '@/lib/utils';
import { UFS } from '@/lib/constants';

type Option = { id: string; name: string; description: string; priceCents: number; days: number };
type Defaults = { recipient: string; phone: string; cep: string; street: string; number: string; complement: string; neighborhood: string; city: string; state: string };

export function CheckoutForm({ defaults, subtotalCents }: { defaults: Defaults; subtotalCents: number }) {
  const [state, action, pending] = useActionState<CheckoutState, FormData>(placeOrder, undefined);
  const [f, setF] = useState(defaults);
  const [options, setOptions] = useState<Option[]>([]);
  const [chosen, setChosen] = useState('');
  const [loading, setLoading] = useState(false);
  const [cepError, setCepError] = useState('');
  const lastCep = useRef('');
  const set = (k: keyof Defaults) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((p) => ({ ...p, [k]: e.target.value }));

  async function lookup(raw: string) {
    const cep = onlyDigits(raw);
    if (cep.length !== 8 || cep === lastCep.current) return;
    lastCep.current = cep;
    setLoading(true);
    setCepError('');
    setOptions([]);
    setChosen('');
    try {
      const res = await fetch('/api/frete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cep }) });
      const data = await res.json();
      if (!res.ok) {
        lastCep.current = '';
        return setCepError(data.error ?? 'Não foi possível consultar o CEP.');
      }
      setF((p) => ({
        ...p,
        street: p.street || data.address.street,
        neighborhood: p.neighborhood || data.address.neighborhood,
        city: data.address.city || p.city,
        state: data.address.state || p.state,
      }));
      if (!data.options.length) setCepError('Ainda não entregamos neste CEP. Fale com a gente no WhatsApp!');
      setOptions(data.options);
      setChosen(data.options[0]?.id ?? '');
    } catch {
      lastCep.current = '';
      setCepError('Falha de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  // Se já veio um endereço salvo, calcula o frete de cara.
  useEffect(() => {
    if (defaults.cep) lookup(defaults.cep);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ship = options.find((o) => o.id === chosen);
  const total = subtotalCents + (ship?.priceCents ?? 0);

  return (
    <form action={action} className="grid gap-8 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-6">
        <section className="card space-y-4 p-6">
          <h2 className="flex items-center gap-2 font-display text-2xl font-bold"><MapPin className="h-6 w-6 text-pink-500" /> Endereço de entrega</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label" htmlFor="recipient">Quem vai receber</label>
              <input id="recipient" name="recipient" value={f.recipient} onChange={set('recipient')} required maxLength={80} autoComplete="name" className="input" />
            </div>
            <div>
              <label className="label" htmlFor="phone">Telefone / WhatsApp</label>
              <input id="phone" name="phone" value={f.phone} onChange={set('phone')} required inputMode="tel" autoComplete="tel" placeholder="(82) 99999-9999" className="input" />
            </div>
            <div>
              <label className="label" htmlFor="cep">CEP</label>
              <div className="relative">
                <input
                  id="cep" name="cep" value={f.cep} required inputMode="numeric" autoComplete="postal-code" maxLength={9} placeholder="00000-000" className="input"
                  onChange={(e) => { const v = formatCep(e.target.value); setF((p) => ({ ...p, cep: v })); if (onlyDigits(v).length === 8) lookup(v); }}
                />
                {loading && <Loader2 className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-sky-500" />}
              </div>
              {cepError && <p role="alert" className="mt-1 text-sm font-bold text-pink-600">{cepError}</p>}
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="street">Rua / Avenida</label>
              <input id="street" name="street" value={f.street} onChange={set('street')} required maxLength={120} autoComplete="address-line1" className="input" />
            </div>
            <div>
              <label className="label" htmlFor="number">Número</label>
              <input id="number" name="number" value={f.number} onChange={set('number')} required maxLength={10} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="complement">Complemento <span className="font-normal text-ink-300">(opcional)</span></label>
              <input id="complement" name="complement" value={f.complement} onChange={set('complement')} maxLength={60} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="neighborhood">Bairro</label>
              <input id="neighborhood" name="neighborhood" value={f.neighborhood} onChange={set('neighborhood')} required maxLength={80} className="input" />
            </div>
            <div className="grid grid-cols-[1fr_5.5rem] gap-3">
              <div>
                <label className="label" htmlFor="city">Cidade</label>
                <input id="city" name="city" value={f.city} onChange={set('city')} required maxLength={80} className="input" />
              </div>
              <div>
                <label className="label" htmlFor="state">UF</label>
                <select id="state" name="state" value={f.state} onChange={set('state')} required className="input !px-2">
                  <option value="" />
                  {UFS.map((u) => <option key={u}>{u}</option>)}
                </select>
              </div>
            </div>
          </div>
        </section>

        <section className="card space-y-3 p-6">
          <h2 className="flex items-center gap-2 font-display text-2xl font-bold"><Truck className="h-6 w-6 text-sky-500" /> Como você quer receber?</h2>
          {options.length === 0 && <p className="rounded-2xl bg-sky-50 p-4 text-sm font-semibold text-sky-700">Digite o CEP acima para ver as opções de entrega e prazos.</p>}
          {options.map((o) => (
            <label key={o.id} className={cn('flex cursor-pointer items-center gap-4 rounded-3xl border-2 p-4 transition-all hover:-translate-y-0.5', chosen === o.id ? 'border-pink-500 bg-pink-50 shadow-candy' : 'border-ink-100 bg-white hover:border-sky-300')}>
              <input type="radio" name="shipping" value={o.id} checked={chosen === o.id} onChange={() => setChosen(o.id)} className="h-5 w-5 accent-pink-500" required />
              <div className="flex-1">
                <p className="font-display text-lg font-semibold">{o.name}</p>
                <p className="text-sm font-bold text-emerald-600">{o.id === 'retirada' ? 'Pronto para retirar amanhã' : `Em até ${o.days} dias úteis`}</p>
                <p className="text-xs text-ink-500">{o.description}</p>
              </div>
              <p className={cn('font-display text-xl font-bold', o.priceCents === 0 ? 'text-emerald-600' : 'text-ink-900')}>{o.priceCents === 0 ? 'Grátis' : brl(o.priceCents)}</p>
            </label>
          ))}
        </section>
      </div>

      <aside className="card h-fit space-y-4 p-6 lg:sticky lg:top-32">
        <h2 className="font-display text-2xl font-bold">Resumo do pedido</h2>
        <div className="flex justify-between"><span>Produtos</span><strong>{brl(subtotalCents)}</strong></div>
        <div className="flex justify-between"><span>Frete</span><strong className={ship?.priceCents === 0 ? 'text-emerald-600' : ''}>{ship ? (ship.priceCents === 0 ? 'Grátis' : brl(ship.priceCents)) : '—'}</strong></div>
        <div className="flex justify-between border-t border-dashed border-pink-200 pt-4 font-display text-2xl font-bold"><span>Total</span><span className="text-pink-600">{brl(total)}</span></div>
        {state?.error && <p role="alert" className="animate-pop rounded-2xl bg-pink-100 px-4 py-3 text-sm font-bold text-pink-700">{state.error}</p>}
        <button className="btn btn-primary btn-lg w-full" disabled={pending || !ship}>
          {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Finalizar pedido'}
        </button>
        <p className="text-xs leading-relaxed text-ink-500">Ao finalizar, seu pedido é registrado e reservamos o estoque. O pagamento online será habilitado em breve — até lá, confirmamos pelo WhatsApp.</p>
      </aside>
    </form>
  );
}
