import { notFound } from 'next/navigation';
import { CouponForm } from '@/components/admin/CouponForm';
import { createClient } from '@/lib/supabase/server';
import { uuidOk } from '@/lib/utils';

/** ISO (UTC) -> valor do input datetime-local em horário de Brasília (UTC-3, sem horário de verão). */
const toLocalInput = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() - 3 * 3600_000).toISOString().slice(0, 16) : '');

export default async function EditCoupon({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuidOk(id)) notFound();
  const supabase = await createClient();
  const { data: c } = await supabase.from('coupons').select('*').eq('id', id).maybeSingle();
  if (!c) notFound();
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">Editar cupom</h1>
      <CouponForm initial={{
        id: c.id, code: c.code, description: c.description ?? '', discountType: c.discount_type, value: c.value,
        minSubtotalCents: c.min_subtotal_cents, maxDiscountCents: c.max_discount_cents, maxUses: c.max_uses,
        maxUsesPerUser: c.max_uses_per_user, startsAt: toLocalInput(c.starts_at), expiresAt: toLocalInput(c.expires_at), active: c.active,
      }} />
    </div>
  );
}
