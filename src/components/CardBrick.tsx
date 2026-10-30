'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { loadMercadoPago } from '@mercadopago/sdk-js';

export type CardSubmit = { token: string; paymentMethodId: string; installments: number; cpf: string };

type BrickController = { unmount: () => void };
type MPInstance = { bricks: () => { create: (name: string, id: string, opts: unknown) => Promise<BrickController> } };

/**
 * Formulário de cartão do Mercado Pago (Card Payment Brick), embutido na página.
 * Os dados do cartão vão direto do navegador para o Mercado Pago, que devolve um TOKEN de uso único;
 * o número do cartão NUNCA passa pelo nosso servidor. O valor aqui (amount) é só para mostrar as
 * parcelas — o servidor cobra o total que está no banco, ignorando qualquer valor do navegador.
 */
export function CardBrick({
  publicKey, amountCents, maxInstallments, email, onSubmit, onError,
}: {
  publicKey: string;
  amountCents: number;
  maxInstallments: number;
  email: string;
  onSubmit: (c: CardSubmit) => Promise<void>;
  onError: (msg: string) => void;
}) {
  const [ready, setReady] = useState(false);
  const submitRef = useRef(onSubmit);
  const errorRef = useRef(onError);
  submitRef.current = onSubmit;
  errorRef.current = onError;

  useEffect(() => {
    let controller: BrickController | null = null;
    let cancelled = false;
    (async () => {
      try {
        await loadMercadoPago();
        if (cancelled) return;
        const MP = (window as unknown as { MercadoPago: new (k: string, o: object) => MPInstance }).MercadoPago;
        const mp = new MP(publicKey, { locale: 'pt-BR' });
        const c = await mp.bricks().create('cardPayment', 'mp-card-brick', {
          initialization: { amount: amountCents / 100, payer: { email } },
          customization: {
            paymentMethods: { maxInstallments },
            visual: { style: { theme: 'default' }, texts: { formSubmit: 'Pagar com cartão' } },
          },
          callbacks: {
            onReady: () => setReady(true),
            onSubmit: async (data: { token: string; payment_method_id: string; installments: number; payer?: { identification?: { number?: string } } }) => {
              await submitRef.current({
                token: data.token,
                paymentMethodId: data.payment_method_id,
                installments: Number(data.installments) || 1,
                cpf: data.payer?.identification?.number ?? '',
              });
            },
            onError: () => errorRef.current('Não foi possível carregar o formulário do cartão. Atualize a página ou use Pix.'),
          },
        });
        if (cancelled) c.unmount(); else controller = c;
      } catch {
        errorRef.current('Não foi possível carregar o formulário do cartão. Atualize a página ou use Pix.');
      }
    })();
    return () => { cancelled = true; try { controller?.unmount(); } catch { /* já removido */ } };
  }, [publicKey, amountCents, maxInstallments, email]);

  return (
    <div>
      {!ready && (
        <p className="flex items-center gap-2 rounded-2xl bg-sky-50 p-4 text-sm font-semibold text-sky-700">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando formulário seguro do cartão…
        </p>
      )}
      <div id="mp-card-brick" />
    </div>
  );
}
