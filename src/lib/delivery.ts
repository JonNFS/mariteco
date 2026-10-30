/** Data prevista de entrega = hoje + N dias úteis (sábado/domingo não contam). */
export function addBusinessDays(from: Date, days: number): Date {
  const d = new Date(from.getTime());
  let left = Math.max(0, Math.floor(days));
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    const wd = d.getUTCDay();
    if (wd !== 0 && wd !== 6) left--;
  }
  return d;
}

/** 'YYYY-MM-DD' (coluna date do Postgres). Retirada/entrega no mesmo dia conta como +1 dia útil. */
export function estimatedDeliveryISO(shippingDays: number, now = new Date()): string {
  return addBusinessDays(now, Math.max(1, shippingDays)).toISOString().slice(0, 10);
}

export function formatDateBR(iso: string | null | undefined): string {
  if (!iso) return 'a combinar';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}
