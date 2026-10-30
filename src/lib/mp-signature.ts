import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Validação da assinatura dos webhooks do Mercado Pago (cabeçalho x-signature).
 * Formato: "ts=1700000000,v1=<hmac sha256 em hex>".
 * Manifesto assinado: "id:<data.id em minúsculas>;request-id:<x-request-id>;ts:<ts>;"
 * ⚠ Confirme no ambiente de testes do Mercado Pago (ver DEPLOY.md). Mesmo que esta checagem
 * falhasse por mudança de formato, o servidor NUNCA confia no corpo do webhook: ele sempre
 * consulta o pedido na API do Mercado Pago antes de aprovar qualquer coisa.
 */
export function parseSignature(header: string | null): { ts: string; v1: string } | null {
  if (!header) return null;
  let ts = '';
  let v1 = '';
  for (const part of header.split(',')) {
    const [k, ...rest] = part.split('=');
    const v = rest.join('=').trim();
    if (k?.trim() === 'ts') ts = v;
    if (k?.trim() === 'v1') v1 = v;
  }
  return ts && v1 ? { ts, v1 } : null;
}

export function buildManifest(dataId: string, requestId: string, ts: string): string {
  return `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
}

export function verifyMpSignature(args: {
  secret: string;
  signatureHeader: string | null;
  requestId: string | null;
  dataId: string | null;
}): boolean {
  const { secret, signatureHeader, requestId, dataId } = args;
  if (!secret || !dataId || !requestId) return false;
  const sig = parseSignature(signatureHeader);
  if (!sig || !/^[0-9a-f]{64}$/i.test(sig.v1)) return false;
  const expected = createHmac('sha256', secret).update(buildManifest(dataId, requestId, sig.ts)).digest();
  const given = Buffer.from(sig.v1, 'hex');
  return given.length === expected.length && timingSafeEqual(given, expected);
}
