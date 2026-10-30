'use client';

import { useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { saveSettings } from '@/app/actions/admin';

export function SettingsForm({ initial }: { initial: { giftWrapPriceCents: number; maxInstallments: number; pixExpirationMinutes: number; boletoExpirationDays: number } }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [gift, setGift] = useState((initial.giftWrapPriceCents / 100).toFixed(2).replace('.', ','));
  const [inst, setInst] = useState(String(initial.maxInstallments));
  const [pix, setPix] = useState(String(initial.pixExpirationMinutes));
  const [boleto, setBoleto] = useState(String(initial.boletoExpirationDays));

  function submit(e: React.FormEvent) {
    e.preventDefault(); setMsg(null);
    const n = Number(gift.replace(/\./g, '').replace(',', '.'));
    start(async () => {
      const r = await saveSettings({
        giftWrapPriceCents: Number.isFinite(n) ? Math.round(n * 100) : -1,
        maxInstallments: Number(inst), pixExpirationMinutes: Number(pix), boletoExpirationDays: Number(boleto),
      });
      setMsg(r.ok ? { ok: true, text: r.message ?? 'Salvo ✔' } : { ok: false, text: r.error });
    });
  }

  return (
    <form onSubmit={submit} className="card grid gap-4 p-6 sm:grid-cols-2">
      <div>
        <label className="label" htmlFor="s-gift">Preço da embalagem de presente (R$)</label>
        <input id="s-gift" value={gift} onChange={(e) => setGift(e.target.value)} inputMode="decimal" className="input" />
        <p className="mt-1 text-xs text-ink-500">0,00 = grátis.</p>
      </div>
      <div>
        <label className="label" htmlFor="s-inst">Parcelas máximas no cartão (1 a 12)</label>
        <input id="s-inst" value={inst} onChange={(e) => setInst(e.target.value)} inputMode="numeric" className="input" />
        <p className="mt-1 text-xs text-ink-500">Juros/parcelas sem juros seguem o que você configurou no Mercado Pago.</p>
      </div>
      <div>
        <label className="label" htmlFor="s-pix">Validade do Pix (minutos, 30 a 1440)</label>
        <input id="s-pix" value={pix} onChange={(e) => setPix(e.target.value)} inputMode="numeric" className="input" />
      </div>
      <div>
        <label className="label" htmlFor="s-boleto">Validade do boleto (dias, 1 a 30)</label>
        <input id="s-boleto" value={boleto} onChange={(e) => setBoleto(e.target.value)} inputMode="numeric" className="input" />
      </div>
      {msg && <p role="status" className={`text-sm font-bold sm:col-span-2 ${msg.ok ? 'text-emerald-600' : 'text-pink-600'}`}>{msg.text}</p>}
      <div className="sm:col-span-2"><button className="btn btn-primary" disabled={pending}>{pending ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Salvar configurações'}</button></div>
    </form>
  );
}
