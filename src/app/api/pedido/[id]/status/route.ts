import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';
import { syncOrderPayment } from '@/lib/orders';
import { uuidOk } from '@/lib/utils';
import { isSupabaseConfigured } from '@/lib/supabase/config';

export const dynamic = 'force-dynamic';

/** A tela do Pix chama isto a cada poucos segundos: confere no Mercado Pago e devolve o status. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!uuidOk(id)) return NextResponse.json({ error: 'not found' }, { status: 404 });

  if (!isSupabaseConfigured) return NextResponse.json({ error: 'demo' }, { status: 503 });
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: 'login' }, { status: 401 });
  if (!rateLimit(`poll:${auth.user.id}`, 40, 60_000)) return NextResponse.json({ error: 'slow down' }, { status: 429 });

  // RLS: só enxerga o próprio pedido
  const { data: own } = await supabase.from('orders').select('id').eq('id', id).maybeSingle();
  if (!own) return NextResponse.json({ error: 'not found' }, { status: 404 });

  await syncOrderPayment(id);
  const { data: o } = await supabase.from('orders').select('status,payment_status').eq('id', id).maybeSingle();
  return NextResponse.json({ status: o?.status, paymentStatus: o?.payment_status });
}
