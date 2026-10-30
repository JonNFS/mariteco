import 'server-only';
import { createHash } from 'node:crypto';
import { centsToAmount, type MpOrder } from './mp-status';

/**
 * Cliente da API Orders do Mercado Pago (somente servidor).
 * O Access Token NUNCA vai para o navegador. O valor cobrado é sempre o total do pedido no banco.
 */
const BASE = process.env.MP_API_BASE || 'https://api.mercadopago.com';

export type PayMethod = 'pix' | 'credit_card' | 'boleto';

export class MpError extends Error {
  constructor(message: string, public status: number, public body?: unknown) {
    super(message);
  }
}

function token() {
  const t = process.env.MP_ACCESS_TOKEN;
  if (!t) throw new MpError('MP_ACCESS_TOKEN não configurado', 500);
  return t;
}

/** Mesma tentativa ⇒ mesma chave (reenvio seguro); nova tentativa ⇒ chave nova. Formato UUID. */
export function idempotencyKey(orderId: string, attempt: number, method: string): string {
  const h = createHash('sha256').update(`mariteco:${orderId}:${attempt}:${method}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

async function mp<T>(path: string, init: RequestInit & { headers?: Record<string, string> }): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    cache: 'no-store',
    signal: AbortSignal.timeout(20_000),
    headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json', ...init.headers },
  });
  const text = await res.text();
  let json: unknown = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* corpo não-JSON */ }
  if (!res.ok) throw new MpError(`Mercado Pago respondeu ${res.status}`, res.status, json);
  return json as T;
}

export type CreateMpOrderInput = {
  orderId: string;          // external_reference
  attempt: number;
  totalCents: number;       // vem do BANCO, nunca do navegador
  method: PayMethod;
  payer: {
    email: string;
    firstName: string;
    lastName: string;
    cpf: string;
    address: { street: string; number: string; neighborhood: string; city: string; state: string; cep: string };
  };
  card?: { token: string; paymentMethodId: string; installments: number };
  pixMinutes: number;
  boletoDays: number;
  deviceId?: string;
};

export async function createMpOrder(i: CreateMpOrderInput): Promise<MpOrder> {
  const amount = centsToAmount(i.totalCents);
  const payment_method =
    i.method === 'pix'
      ? { id: 'pix', type: 'bank_transfer' }
      : i.method === 'boleto'
        ? { id: 'boleto', type: 'ticket' }
        : { id: i.card!.paymentMethodId, type: 'credit_card', token: i.card!.token, installments: i.card!.installments };

  const payment: Record<string, unknown> = { amount, payment_method };
  if (i.method === 'pix') payment.expiration_time = `PT${i.pixMinutes}M`;
  if (i.method === 'boleto') payment.expiration_time = `P${i.boletoDays}D`;

  const body = {
    type: 'online',
    processing_mode: 'automatic',
    total_amount: amount,
    external_reference: i.orderId,
    payer: {
      email: i.payer.email,
      first_name: i.payer.firstName,
      last_name: i.payer.lastName,
      identification: { type: 'CPF', number: i.payer.cpf },
      address: {
        street_name: i.payer.address.street,
        street_number: i.payer.address.number,
        zip_code: i.payer.address.cep,
        neighborhood: i.payer.address.neighborhood,
        state: i.payer.address.state,
        city: i.payer.address.city,
      },
    },
    config: { location: { state_id: `BR-${i.payer.address.state}` } },
    transactions: { payments: [payment] },
  };

  return mp<MpOrder>('/v1/orders', {
    method: 'POST',
    headers: {
      'X-Idempotency-Key': idempotencyKey(i.orderId, i.attempt, i.method),
      ...(i.deviceId ? { 'X-meli-session-id': i.deviceId } : {}),
    },
    body: JSON.stringify(body),
  });
}

export async function getMpOrder(mpOrderId: string): Promise<MpOrder> {
  if (!/^[A-Za-z0-9_-]{5,64}$/.test(mpOrderId)) throw new MpError('ID inválido', 400);
  return mp<MpOrder>(`/v1/orders/${encodeURIComponent(mpOrderId)}`, { method: 'GET' });
}
