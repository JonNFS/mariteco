import { NextResponse, type NextRequest } from 'next/server';
import { verifyMpSignature } from '@/lib/mp-signature';
import { getMpOrder } from '@/lib/mercadopago';
import { applyMpOrder } from '@/lib/orders';

export const dynamic = 'force-dynamic';

/**
 * Webhook do Mercado Pago (tópico "order").
 * 1) confere a assinatura (HMAC com a "assinatura secreta" do painel);
 * 2) NÃO usa o corpo para decidir nada: busca o pedido direto na API do Mercado Pago;
 * 3) aplica de forma idempotente (valor e referência conferidos no banco).
 */
export async function POST(request: NextRequest) {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[webhook] MP_WEBHOOK_SECRET ausente');
    return NextResponse.json({ error: 'not configured' }, { status: 500 });
  }

  const body = await request.json().catch(() => null);
  const dataId = request.nextUrl.searchParams.get('data.id') ?? (typeof body?.data?.id === 'string' ? body.data.id : null);

  const valid = verifyMpSignature({
    secret,
    signatureHeader: request.headers.get('x-signature'),
    requestId: request.headers.get('x-request-id'),
    dataId,
  });
  if (!valid) return NextResponse.json({ error: 'invalid signature' }, { status: 401 });

  if (!dataId || !/^[A-Za-z0-9_-]{5,64}$/.test(dataId)) return NextResponse.json({ ok: true, ignored: true });

  try {
    const result = await applyMpOrder(await getMpOrder(dataId));
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    console.error('[webhook] falha', dataId, e instanceof Error ? e.message : e);
    return NextResponse.json({ error: 'retry' }, { status: 500 }); // o Mercado Pago tenta de novo
  }
}
