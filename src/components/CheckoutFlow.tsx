'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Barcode, Check, CreditCard, Gift, Loader2, Lock, MapPin, QrCode, Tag, Truck, Wallet } from 'lucide-react';
import { cancelUnpaidOrder, payOrder, previewQuote, type QuoteResult } from '@/app/actions/checkout';
import { CardBrick, type CardSubmit } from '@/components/CardBrick';
import { brl, cn, formatCep, onlyDigits } from '@/lib/utils';
import { formatCpf } from '@/lib/cpf';
import { formatDateBR } from '@/lib/delivery';
import { UFS } from '@/lib/constants';

type Option = { id: string; name: string; description: string; priceCents: number; days: number };
type Defaults = { recipient: string; phone: string; cep: string; street: string; number: string; complement: string; neighborhood: string; city: string; state: string };
type Method = 'pix' | 'credit_card' | 'boleto';

const STEPS = [
  { n: 1, label: 'Entrega', icon: MapPin },
  { n: 2, label: 'Presente e cupom', icon: Gift },
  { n: 3, label: 'Pagamento', icon: Wallet },
  { n: 4, label: 'Pronto!', icon: Check },
];

export function CheckoutFlow(props: {
  defaults: Defaults;
  subtotalCents: number;
  itemCount: number;
  email: string;
  publicKey: string;
  maxInstallments: number;
  giftPriceCents: number;
  pixMinutes: number;
  boletoDays: number;
}) {
  const { defaults, subtotalCents, email, publicKey } = props;
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [f, setF] = useState(defaults);
  const [options, setOptions] = useState<Option[]>([]);
  const [chosen, setChosen] = useState('');
  const [loadingCep, setLoadingCep] = useState(false);
  const [cepError, setCepError] = useState('');
  const lastCep = useRef('');

  const [gift, setGift] = useState(false);
  const [giftFrom, setGiftFrom] = useState('');
  const [giftTo, setGiftTo] = useState('');
  const [giftMsg, setGiftMsg] = useState('');
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState('');
  const [couponMsg, setCouponMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [applying, setApplying] = useState(false);

  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [method, setMethod] = useState<Method>('pix');
  const [cpf, setCpf] = useState('');
  const [accept, setAccept] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [orderId, setOrderId] = useState<string | undefined>();

  const set = (k: keyof Defaults) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((p) => ({ ...p, [k]: e.target.value }));
  const locked = !!orderId; // depois de reservado, só o pagamento pode mudar

  async function lookup(raw: string) {
    const cep = onlyDigits(raw);
    if (cep.length !== 8 || cep === lastCep.current) return;
    lastCep.current = cep;
    setLoadingCep(true); setCepError(''); setOptions([]); setChosen('');
    try {
      const res = await fetch('/api/frete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cep }) });
      const data = await res.json();
      if (!res.ok) { lastCep.current = ''; return setCepError(data.error ?? 'Não foi possível consultar o CEP.'); }
      setF((p) => ({ ...p, street: p.street || data.address.street, neighborhood: p.neighborhood || data.address.neighborhood, city: data.address.city || p.city, state: data.address.state || p.state }));
      if (!data.options.length) setCepError('Ainda não entregamos neste CEP. Fale com a gente no WhatsApp!');
      setOptions(data.options);
      setChosen(data.options[0]?.id ?? '');
    } catch { lastCep.current = ''; setCepError('Falha de conexão. Tente novamente.'); }
    finally { setLoadingCep(false); }
  }
  useEffect(() => { if (defaults.cep) lookup(defaults.cep); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  // Valores exibidos vêm SEMPRE do servidor (previewQuote); o navegador não calcula preço.
  const refreshQuote = useCallback(async (code: string) => {
    if (!chosen || onlyDigits(f.cep).length !== 8) return null;
    const q = await previewQuote({ cep: onlyDigits(f.cep), shipping: chosen, couponCode: code, giftWrap: gift });
    setQuote(q);
    return q;
  }, [chosen, f.cep, gift]);
  useEffect(() => { if (!locked) void refreshQuote(coupon); }, [refreshQuote, coupon, locked]);

  async function applyCoupon() {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setApplying(true); setCouponMsg(null);
    const q = await refreshQuote(code);
    setApplying(false);
    if (q && q.ok && q.couponApplied) { setCoupon(code); setCouponMsg({ ok: true, text: `Cupom ${code} aplicado!` }); }
    else { setCoupon(''); setCouponMsg({ ok: false, text: (q && q.ok && q.couponError) || (q && !q.ok && q.error) || 'Cupom inválido ou expirado.' }); void refreshQuote(''); }
  }

  const q = quote && quote.ok ? quote : null;
  const total = q?.totalCents ?? subtotalCents;

  async function submit(card?: CardSubmit) {
    setError(''); setBusy(true);
    const deviceId = (window as unknown as { MP_DEVICE_SESSION_ID?: string }).MP_DEVICE_SESSION_ID;
    const res = await payOrder({
      orderId, ...f, phone: onlyDigits(f.phone), cep: onlyDigits(f.cep), shipping: chosen,
      cpf: card?.cpf || cpf, couponCode: coupon, giftWrap: gift, giftFrom, giftTo, giftMessage: giftMsg,
      method, accept, deviceId,
      card: card ? { token: card.token, paymentMethodId: card.paymentMethodId, installments: card.installments } : undefined,
    });
    setBusy(false);
    if (res.ok) { setStep(4); router.push(`/pedido/${res.orderId}${res.paid ? '?pago=1' : ''}`); return; }
    if (res.needsLogin) { router.push('/entrar?next=/checkout'); return; }
    if (res.orderId) setOrderId(res.orderId);
    setError(res.error);
    if (card) throw new Error(res.error); // o Brick libera o botão para tentar de novo
  }

  async function cancelReserved() {
    if (!orderId) return;
    setBusy(true);
    const r = await cancelUnpaidOrder(orderId);
    setBusy(false);
    if (r.ok) { setOrderId(undefined); setError(''); setStep(1); router.refresh(); } else setError(r.error ?? 'Não foi possível cancelar.');
  }

  const ship = options.find((o) => o.id === chosen);
  const goStep = (n: number) => { if (!locked || n === 3) setStep(n); };

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-6">
        {/* passos sempre visíveis */}
        <ol className="grid grid-cols-4 gap-2" aria-label="Etapas da compra">
          {STEPS.map(({ n, label, icon: Icon }) => {
            const done = step > n; const cur = step === n;
            return (
              <li key={n}>
                <button type="button" onClick={() => n < step && goStep(n)} disabled={n >= step || (locked && n !== 3)}
                  aria-current={cur ? 'step' : undefined}
                  className={cn('flex w-full flex-col items-center gap-1 rounded-3xl px-1 py-3 text-center text-xs font-bold transition-all sm:text-sm',
                    cur ? 'bg-pink-500 text-white shadow-candy' : done ? 'bg-mint-100 text-emerald-700' : 'bg-white text-ink-500 ring-1 ring-ink-100')}>
                  <span className={cn('grid h-8 w-8 place-items-center rounded-full', cur ? 'bg-white/25' : done ? 'bg-emerald-500 text-white' : 'bg-ink-100')}>
                    {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </span>
                  <span className="leading-tight">{n}. {label}</span>
                </button>
              </li>
            );
          })}
        </ol>

        {/* 1. ENTREGA */}
        {step === 1 && (
          <form onSubmit={(e) => { e.preventDefault(); if (chosen) setStep(2); }} className="space-y-6">
            <section className="card space-y-4 p-6">
              <h2 className="flex items-center gap-2 font-display text-2xl font-bold"><MapPin className="h-6 w-6 text-pink-500" /> Endereço de entrega</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="label" htmlFor="recipient">Quem vai receber</label>
                  <input id="recipient" value={f.recipient} onChange={set('recipient')} required maxLength={80} autoComplete="name" className="input" />
                </div>
                <div>
                  <label className="label" htmlFor="phone">Telefone / WhatsApp</label>
                  <input id="phone" value={f.phone} onChange={set('phone')} required inputMode="tel" autoComplete="tel" placeholder="(82) 99999-9999" className="input" />
                </div>
                <div>
                  <label className="label" htmlFor="cep">CEP</label>
                  <div className="relative">
                    <input id="cep" value={f.cep} required inputMode="numeric" autoComplete="postal-code" maxLength={9} placeholder="00000-000" className="input"
                      onChange={(e) => { const v = formatCep(e.target.value); setF((p) => ({ ...p, cep: v })); if (onlyDigits(v).length === 8) void lookup(v); }} />
                    {loadingCep && <Loader2 className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-sky-500" />}
                  </div>
                  {cepError && <p role="alert" className="mt-1 text-sm font-bold text-pink-600">{cepError}</p>}
                </div>
                <div className="sm:col-span-2">
                  <label className="label" htmlFor="street">Rua / Avenida</label>
                  <input id="street" value={f.street} onChange={set('street')} required maxLength={120} autoComplete="address-line1" className="input" />
                </div>
                <div>
                  <label className="label" htmlFor="number">Número</label>
                  <input id="number" value={f.number} onChange={set('number')} required maxLength={10} className="input" />
                </div>
                <div>
                  <label className="label" htmlFor="complement">Complemento <span className="font-normal text-ink-300">(opcional)</span></label>
                  <input id="complement" value={f.complement} onChange={set('complement')} maxLength={60} className="input" />
                </div>
                <div>
                  <label className="label" htmlFor="neighborhood">Bairro</label>
                  <input id="neighborhood" value={f.neighborhood} onChange={set('neighborhood')} required maxLength={80} className="input" />
                </div>
                <div className="grid grid-cols-[1fr_5.5rem] gap-3">
                  <div>
                    <label className="label" htmlFor="city">Cidade</label>
                    <input id="city" value={f.city} onChange={set('city')} required maxLength={80} className="input" />
                  </div>
                  <div>
                    <label className="label" htmlFor="state">UF</label>
                    <select id="state" value={f.state} onChange={set('state')} required className="input !px-2">
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
            <button className="btn btn-primary btn-lg w-full sm:w-auto" disabled={!chosen}>Continuar</button>
          </form>
        )}

        {/* 2. PRESENTE E CUPOM */}
        {step === 2 && (
          <form onSubmit={(e) => { e.preventDefault(); if (gift && (!giftFrom.trim() || !giftTo.trim())) return; setStep(3); }} className="space-y-6">
            <section className="card space-y-4 p-6">
              <label className="flex cursor-pointer items-start gap-4">
                <input type="checkbox" checked={gift} onChange={(e) => setGift(e.target.checked)} className="mt-1 h-5 w-5 accent-pink-500" />
                <span className="flex-1">
                  <span className="flex items-center gap-2 font-display text-xl font-bold"><Gift className="h-6 w-6 text-pink-500" /> Embalar para presente 🎁</span>
                  <span className="block text-sm text-ink-500">Caprichamos na embalagem e colocamos um cartãozinho com seu recado. {props.giftPriceCents > 0 ? `Adicional de ${brl(props.giftPriceCents)}.` : 'Sem custo!'}</span>
                </span>
              </label>
              {gift && (
                <div className="grid animate-pop gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label" htmlFor="gfrom">De (quem está enviando)</label>
                    <input id="gfrom" value={giftFrom} onChange={(e) => setGiftFrom(e.target.value)} required maxLength={60} className="input" placeholder="Ex.: Vovó Lúcia" />
                  </div>
                  <div>
                    <label className="label" htmlFor="gto">Para (quem vai receber)</label>
                    <input id="gto" value={giftTo} onChange={(e) => setGiftTo(e.target.value)} required maxLength={60} className="input" placeholder="Ex.: Maria Clara" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label" htmlFor="gmsg">Mensagem do cartão <span className="font-normal text-ink-300">(opcional)</span></label>
                    <textarea id="gmsg" value={giftMsg} onChange={(e) => setGiftMsg(e.target.value)} maxLength={200} rows={3} className="input" placeholder="Feliz aniversário! Com muito amor 💖" />
                    <p className="mt-1 text-right text-xs text-ink-300">{giftMsg.length}/200</p>
                  </div>
                </div>
              )}
            </section>

            <section className="card space-y-3 p-6">
              <h2 className="flex items-center gap-2 font-display text-2xl font-bold"><Tag className="h-6 w-6 text-sky-500" /> Cupom de desconto</h2>
              <div className="flex gap-3">
                <input value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())} maxLength={32} className="input flex-1 uppercase" placeholder="Digite seu cupom" aria-label="Cupom" />
                <button type="button" onClick={applyCoupon} disabled={applying || !couponInput.trim()} className="btn btn-blue">{applying ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Aplicar'}</button>
              </div>
              {couponMsg && <p role="status" className={cn('rounded-2xl px-4 py-2 text-sm font-bold', couponMsg.ok ? 'bg-mint-100 text-emerald-700' : 'bg-pink-100 text-pink-700')}>{couponMsg.text}</p>}
            </section>

            <div className="flex flex-wrap gap-3">
              <button type="button" className="btn btn-soft" onClick={() => setStep(1)}>Voltar</button>
              <button className="btn btn-primary btn-lg">Continuar para o pagamento</button>
            </div>
          </form>
        )}

        {/* 3. PAGAMENTO */}
        {step === 3 && (
          <section className="card space-y-5 p-6">
            <h2 className="flex items-center gap-2 font-display text-2xl font-bold"><Wallet className="h-6 w-6 text-pink-500" /> Como você quer pagar?</h2>
            {locked && (
              <p className="rounded-2xl bg-sky-50 p-4 text-sm font-semibold text-sky-800">
                Seu pedido está reservado por alguns minutos. Escolha como pagar abaixo ou{' '}
                <button type="button" onClick={cancelReserved} className="underline" disabled={busy}>cancele e recomece</button>.
              </p>
            )}
            <div role="tablist" className="grid grid-cols-3 gap-2">
              {([['pix', 'Pix', QrCode], ['credit_card', 'Cartão', CreditCard], ['boleto', 'Boleto', Barcode]] as const).map(([id, label, Icon]) => (
                <button key={id} type="button" role="tab" aria-selected={method === id} onClick={() => { setMethod(id); setError(''); }}
                  className={cn('flex flex-col items-center gap-1 rounded-3xl border-2 p-3 font-display font-semibold transition-all hover:-translate-y-0.5', method === id ? 'border-pink-500 bg-pink-50 shadow-candy' : 'border-ink-100 bg-white')}>
                  <Icon className="h-6 w-6" /> {label}
                </button>
              ))}
            </div>

            {method === 'credit_card' ? (
              <div className="space-y-4">
                <p className="text-sm text-ink-500">Parcele em até {props.maxInstallments}x. Os dados do cartão vão direto para o Mercado Pago — a Mariteco nunca vê o número do seu cartão.</p>
                {!publicKey ? (
                  <p className="rounded-2xl bg-pink-100 p-4 text-sm font-bold text-pink-700">Pagamento online ainda não configurado.</p>
                ) : (
                  <CardBrick publicKey={publicKey} amountCents={total} maxInstallments={props.maxInstallments} email={email}
                    onError={setError}
                    onSubmit={async (c) => { if (!accept) { setError('Aceite os termos para continuar.'); throw new Error('terms'); } await submit(c); }} />
                )}
              </div>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); void submit(); }} className="space-y-4">
                <p className="rounded-2xl bg-sky-50 p-4 text-sm text-sky-800">
                  {method === 'pix'
                    ? `Você receberá um QR Code e o código "copia e cola" na próxima tela. Aprovação na hora. Válido por ${props.pixMinutes >= 60 ? `${Math.round(props.pixMinutes / 60)}h` : `${props.pixMinutes} min`}.`
                    : `Geramos o boleto na próxima tela. A compensação leva até 2 dias úteis e o boleto vale por ${props.boletoDays} dias.`}
                </p>
                <div>
                  <label className="label" htmlFor="cpf">CPF do pagador</label>
                  <input id="cpf" value={cpf} onChange={(e) => setCpf(formatCpf(e.target.value))} required inputMode="numeric" autoComplete="off" maxLength={14} placeholder="000.000.000-00" className="input" />
                  <p className="mt-1 text-xs text-ink-500">Exigido para Pix e boleto. Enviado ao Mercado Pago; a loja não guarda o seu CPF.</p>
                </div>
                <TermsBox accept={accept} setAccept={setAccept} />
                <button className="btn btn-primary btn-lg w-full" disabled={busy || !accept}>
                  {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Lock className="h-5 w-5" /> {method === 'pix' ? 'Gerar Pix' : 'Gerar boleto'} · {brl(total)}</>}
                </button>
              </form>
            )}
            {method === 'credit_card' && <TermsBox accept={accept} setAccept={setAccept} />}
            {error && <p role="alert" className="animate-pop rounded-2xl bg-pink-100 px-4 py-3 text-sm font-bold text-pink-700">{error}</p>}
            {!locked && <button type="button" className="btn btn-soft btn-sm" onClick={() => setStep(2)}>Voltar</button>}
            <p className="flex items-center gap-2 text-xs text-ink-500"><Lock className="h-4 w-4" /> Pagamento processado pelo Mercado Pago, com criptografia.</p>
          </section>
        )}

        {step === 4 && (
          <p className="card flex items-center gap-3 p-6 font-display text-xl font-bold"><Loader2 className="h-6 w-6 animate-spin text-pink-500" /> Pronto! Abrindo seu pedido…</p>
        )}
      </div>

      {/* resumo (valores calculados pelo servidor) */}
      <aside className="card h-fit space-y-3 p-6 lg:sticky lg:top-32">
        <h2 className="font-display text-2xl font-bold">Resumo do pedido</h2>
        <Row l={`Produtos (${props.itemCount})`} v={brl(subtotalCents)} />
        <Row l="Frete" v={q ? (q.shippingCents === 0 ? 'Grátis' : brl(q.shippingCents)) : ship ? (ship.priceCents === 0 ? 'Grátis' : brl(ship.priceCents)) : '—'} good={q?.shippingCents === 0} />
        {q && q.giftFeeCents > 0 && <Row l="Embalagem de presente" v={brl(q.giftFeeCents)} />}
        {q && q.discountCents > 0 && <Row l={`Cupom ${coupon}`} v={`− ${brl(q.discountCents)}`} good />}
        <div className="flex justify-between border-t border-dashed border-pink-200 pt-4 font-display text-2xl font-bold"><span>Total</span><span className="text-pink-600">{brl(total)}</span></div>
        {q && <p className="rounded-2xl bg-mint-100 px-3 py-2 text-sm font-bold text-emerald-700">📦 Chega até {formatDateBR(q.estimatedDelivery)}</p>}
        <p className="text-xs leading-relaxed text-ink-500">Os valores são calculados e conferidos pelo nosso servidor no momento do pagamento.</p>
      </aside>
    </div>
  );
}

function Row({ l, v, good }: { l: string; v: string; good?: boolean }) {
  return <div className="flex justify-between"><span>{l}</span><strong className={good ? 'text-emerald-600' : ''}>{v}</strong></div>;
}

function TermsBox({ accept, setAccept }: { accept: boolean; setAccept: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-sm text-ink-700">
      <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} className="mt-1 h-5 w-5 accent-pink-500" />
      <span>Li e aceito os <Link href="/termos" target="_blank" className="font-bold text-pink-600 underline">Termos de compra</Link> e a <Link href="/privacidade" target="_blank" className="font-bold text-pink-600 underline">Política de Privacidade</Link>.</span>
    </label>
  );
}
