/** Tradução dos status da API Orders do Mercado Pago para o status interno. Pura. */
export type PayStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'cancelled' | 'refunded';

export type MpPayment = {
  id?: string;
  status?: string;
  status_detail?: string;
  amount?: string;
  payment_method?: {
    id?: string;
    type?: string;
    installments?: number;
    qr_code?: string;
    qr_code_base64?: string;
    ticket_url?: string;
    barcode_content?: string;
    digitable_line?: string;
  };
};

export type MpOrder = {
  id?: string;
  status?: string;
  status_detail?: string;
  external_reference?: string;
  total_amount?: string;
  total_paid_amount?: string;
  transactions?: { payments?: MpPayment[] };
};

const lower = (s?: string) => (s ?? '').toLowerCase();

export function mapMpStatus(o: MpOrder): PayStatus {
  const p = o.transactions?.payments?.[0];
  const ps = lower(p?.status);
  const pd = lower(p?.status_detail);
  const os = lower(o.status);
  const od = lower(o.status_detail);

  if (['refunded', 'partially_refunded', 'charged_back'].includes(os) || ps === 'refunded' || ps === 'charged_back') return 'refunded';
  // aprovado SOMENTE com crédito confirmado (processed sozinho não basta)
  if (pd === 'accredited' || od === 'accredited' || ps === 'approved') return 'approved';
  if (os === 'expired' || ps === 'expired' || pd.includes('expired')) return 'expired';
  if (['canceled', 'cancelled'].includes(os) || ['canceled', 'cancelled'].includes(ps)) return 'cancelled';
  if (['failed', 'rejected'].includes(os) || ['failed', 'rejected'].includes(ps)) return 'rejected';
  return 'pending';
}

export const toCents = (amount: string | number | undefined): number | null => {
  if (amount === undefined || amount === null || amount === '') return null;
  const n = Number(amount);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
};

export const centsToAmount = (cents: number) => (cents / 100).toFixed(2);
