'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Barcode, Check, Copy, ExternalLink, Loader2, QrCode } from 'lucide-react';

type Props = {
  orderId: string;
  method: 'pix' | 'boleto' | 'credit_card' | null;
  pixCode: string | null;
  pixQrBase64: string | null;
  boletoUrl: string | null;
  boletoLine: string | null;
  expiresAt: string | null;
};

function useCopy() {
  const [ok, setOk] = useState(false);
  return [ok, async (text: string) => {
    try { await navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 2500); } catch { /* sem permissão */ }
  }] as const;
}

/** Mostra o Pix/boleto e confere o pagamento sozinho a cada 4 s (o webhook também atualiza). */
export function PaymentPanel(p: Props) {
  const router = useRouter();
  const [copied, copy] = useCopy();
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    let stop = false;
    async function tick() {
      try {
        setChecking(true);
        const res = await fetch(`/api/pedido/${p.orderId}/status`, { cache: 'no-store' });
        if (res.ok) {
          const d = await res.json();
          if (!stop && (d.status !== 'aguardando_pagamento' || d.paymentStatus !== 'pending')) router.refresh();
        }
      } finally { setChecking(false); }
    }
    const id = setInterval(() => { if (document.visibilityState === 'visible') void tick(); }, 4000);
    return () => { stop = true; clearInterval(id); };
  }, [p.orderId, router]);

  const code = p.method === 'pix' ? p.pixCode : p.boletoLine;

  if (!p.method || p.method === 'credit_card' || (!p.pixCode && !p.boletoLine && !p.boletoUrl)) {
    return (
      <p className="mt-4 flex items-center justify-center gap-2 text-sm font-semibold text-sky-800">
        <Loader2 className="h-4 w-4 animate-spin" /> Confirmando seu pagamento…
      </p>
    );
  }

  return (
    <div className="mx-auto mt-6 max-w-md space-y-4 rounded-3xl bg-sky-50 p-5 text-left text-sm text-sky-900">
      <p className="flex items-center gap-2 font-display text-lg font-bold">
        {p.method === 'pix' ? <QrCode className="h-5 w-5" /> : <Barcode className="h-5 w-5" />}
        {p.method === 'pix' ? 'Pague com Pix' : 'Pague com boleto'}
      </p>
      {p.method === 'pix' && p.pixQrBase64 && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`data:image/png;base64,${p.pixQrBase64}`} alt="QR Code do Pix" width={224} height={224} className="mx-auto h-56 w-56 rounded-2xl bg-white p-2 ring-2 ring-sky-200" />
      )}
      {p.method === 'pix' && <ol className="list-decimal space-y-1 pl-5"><li>Abra o app do seu banco e escolha Pix.</li><li>Leia o QR Code ou use o “copia e cola”.</li><li>Confirme — a gente avisa aqui e no WhatsApp!</li></ol>}
      {code && (
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-wide">{p.method === 'pix' ? 'Pix copia e cola' : 'Linha digitável'}</p>
          <p className="break-all rounded-2xl bg-white p-3 font-mono text-xs">{code}</p>
          <button type="button" onClick={() => copy(code)} className="btn btn-blue btn-sm mt-2 w-full">
            {copied ? <><Check className="h-4 w-4" /> Copiado!</> : <><Copy className="h-4 w-4" /> Copiar código</>}
          </button>
        </div>
      )}
      {p.method === 'boleto' && p.boletoUrl && (
        <a href={p.boletoUrl} target="_blank" rel="noopener noreferrer" className="btn btn-soft btn-sm w-full"><ExternalLink className="h-4 w-4" /> Abrir boleto (PDF)</a>
      )}
      {p.expiresAt && <p className="text-xs">Válido até {new Date(p.expiresAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}. Seus itens ficam reservados até lá.</p>}
      <p className="flex items-center gap-2 text-xs font-semibold">{checking ? <Loader2 className="h-3 w-3 animate-spin" /> : <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />} Aguardando o pagamento — esta tela atualiza sozinha.</p>
    </div>
  );
}
