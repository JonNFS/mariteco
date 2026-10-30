'use client';

import { useState, useTransition } from 'react';
import { getWhatsAppText } from '@/app/actions/admin';
import { WhatsAppIcon } from '@/components/icons';

export function WhatsAppSendButton({ orderId, status }: { orderId: string; status: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState('');
  const event = status === 'enviado' ? 'order_shipped' : status === 'aguardando_pagamento' ? 'order_created' : 'order_paid';
  return (
    <span className="inline-flex flex-col gap-1">
      <button type="button" className="btn btn-whatsapp btn-sm btn-icon" disabled={pending}
        onClick={() => start(async () => {
          setError('');
          const r = await getWhatsAppText(orderId, event);
          if (r.ok && r.url) window.open(r.url, '_blank', 'noopener,noreferrer'); else setError(r.error ?? 'Erro');
        })}>
        <WhatsAppIcon className="h-4 w-4" /> Enviar pelo WhatsApp
      </button>
      {error && <span role="alert" className="text-xs font-bold text-pink-600">{error}</span>}
    </span>
  );
}
