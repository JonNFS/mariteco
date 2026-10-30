'use client';

import { useMemo, useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { saveTemplate } from '@/app/actions/admin';
import { PLACEHOLDERS, renderTemplate } from '@/lib/templates';

export type TemplateRow = { key: 'order_created' | 'order_paid' | 'order_shipped'; label: string; email_subject: string; email_body: string; whatsapp_body: string; email_enabled: boolean; whatsapp_enabled: boolean };

const SAMPLE = {
  pedido: '1', nome: 'Maria', valor: 'R$ 199,90',
  produtos: '• Vestido Floral (tam. 4) x1 = R$ 59,90\n• Tênis Estrela (tam. 26) x1 = R$ 89,90\n• Body Nuvem (tam. M) x1 = R$ 50,10',
  entrega: 'Envio rápido', previsao: '31/10/2026', pagamento: 'Pix',
  presente: '\n🎁 Embalagem de presente\nDe: Vovó Lúcia\nPara: Maria Clara\n', rastreio: 'BR123456789', link: 'https://suaLoja/pedido/…',
};

export function TemplateEditor({ row }: { row: TemplateRow }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [f, setF] = useState({ subject: row.email_subject, email: row.email_body, wa: row.whatsapp_body, emailOn: row.email_enabled, waOn: row.whatsapp_enabled });
  const preview = useMemo(() => renderTemplate(f.wa, SAMPLE), [f.wa]);

  function save(e: React.FormEvent) {
    e.preventDefault(); setMsg(null);
    start(async () => {
      const r = await saveTemplate({ key: row.key, emailSubject: f.subject, emailBody: f.email, whatsappBody: f.wa, emailEnabled: f.emailOn, whatsappEnabled: f.waOn });
      setMsg(r.ok ? { ok: true, text: r.message ?? 'Salvo ✔' } : { ok: false, text: r.error });
    });
  }

  return (
    <form onSubmit={save} className="card space-y-4 p-6">
      <h2 className="font-display text-2xl font-bold">{row.label}</h2>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <label className="flex items-center gap-2 font-bold"><input type="checkbox" checked={f.emailOn} onChange={(e) => setF({ ...f, emailOn: e.target.checked })} className="h-5 w-5 accent-pink-500" /> Enviar por e-mail</label>
          <input value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} className="input" aria-label="Assunto do e-mail" maxLength={150} required />
          <textarea value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} rows={10} className="input font-mono text-sm" aria-label="Texto do e-mail" maxLength={4000} required />
        </div>
        <div className="space-y-3">
          <label className="flex items-center gap-2 font-bold"><input type="checkbox" checked={f.waOn} onChange={(e) => setF({ ...f, waOn: e.target.checked })} className="h-5 w-5 accent-pink-500" /> Enviar por WhatsApp</label>
          <textarea value={f.wa} onChange={(e) => setF({ ...f, wa: e.target.value })} rows={8} className="input font-mono text-sm" aria-label="Texto do WhatsApp" maxLength={2000} required />
          <div>
            <p className="label">Prévia (WhatsApp)</p>
            <pre className="whitespace-pre-wrap rounded-3xl bg-[#DCF8C6] p-4 font-sans text-sm text-ink-900">{preview}</pre>
          </div>
        </div>
      </div>
      <p className="text-xs text-ink-500">Campos disponíveis: {PLACEHOLDERS.map(([k, d]) => <span key={k} title={d} className="mr-2 inline-block rounded-full bg-sky-50 px-2 py-0.5 font-mono">{k}</span>)}</p>
      {msg && <p role="status" className={`text-sm font-bold ${msg.ok ? 'text-emerald-600' : 'text-pink-600'}`}>{msg.text}</p>}
      <button className="btn btn-primary btn-sm" disabled={pending}>{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar mensagem'}</button>
    </form>
  );
}
