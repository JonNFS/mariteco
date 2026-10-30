import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

export type StoreSettings = {
  giftWrapPriceCents: number;
  maxInstallments: number;
  pixExpirationMinutes: number;
  boletoExpirationDays: number;
};

export const DEFAULT_SETTINGS: StoreSettings = {
  giftWrapPriceCents: 0,
  maxInstallments: 3,
  pixExpirationMinutes: 60,
  boletoExpirationDays: 3,
};

const clamp = (n: unknown, min: number, max: number, d: number) => {
  const v = Number(n);
  return Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : d;
};

export async function getSettings(): Promise<StoreSettings> {
  try {
    const { data } = await createAdminClient().from('store_settings').select('key,value');
    const m = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
    return {
      giftWrapPriceCents: clamp(m.gift_wrap_price_cents, 0, 100_000, DEFAULT_SETTINGS.giftWrapPriceCents),
      maxInstallments: clamp(m.max_installments, 1, 12, DEFAULT_SETTINGS.maxInstallments),
      pixExpirationMinutes: clamp(m.pix_expiration_minutes, 30, 1440, DEFAULT_SETTINGS.pixExpirationMinutes),
      boletoExpirationDays: clamp(m.boleto_expiration_days, 1, 30, DEFAULT_SETTINGS.boletoExpirationDays),
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}
