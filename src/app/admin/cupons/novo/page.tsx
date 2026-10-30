import { CouponForm } from '@/components/admin/CouponForm';

export default function NewCoupon() {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">Novo cupom</h1>
      <CouponForm initial={{ code: '', description: '', discountType: 'percent', value: 10, minSubtotalCents: 0, maxDiscountCents: null, maxUses: null, maxUsesPerUser: 1, startsAt: '', expiresAt: '', active: true }} />
    </div>
  );
}
