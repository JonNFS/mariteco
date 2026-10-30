import { NextResponse, type NextRequest } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/** Cron diário (vercel.json): libera estoque/cupom de pedidos não pagos. Protegido por CRON_SECRET. */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const given = request.headers.get('authorization') ?? '';
  const expected = `Bearer ${secret ?? ''}`;
  const ok = !!secret && given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
  if (!ok) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { data, error } = await createAdminClient().rpc('release_expired_orders');
  if (error) return NextResponse.json({ error: 'failed' }, { status: 500 });
  return NextResponse.json({ released: data });
}
