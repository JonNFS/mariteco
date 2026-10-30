import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { brl, } from '@/lib/utils';
import { formatDateBR } from '@/lib/delivery';
import { SITE } from '@/lib/constants';
import { normalizeBrPhone, renderTemplate, sanitizeWaParam } from '@/lib/templates';

export type NotifyEvent = 'order_created' | 'order_paid' | 'order_shipped';

const PAY_LABEL: Record<string, string> = { pix: 'Pix', credit_card: 'Cartão de crédito', boleto: 'Boleto' };
const SHIP_LABEL: Record<string, string> = { retirada: 'Retirada na loja', local: 'Entrega local (Maceió)', economico: 'Envio econômico', expresso: 'Envio rápido' };

type Built = {
  vars: Record<string, string>;
  phone: string | null;
  email: string | null;
};

async function build(orderId: string): Promise<Built | null> {
  const admin = createAdminClient();
  const { data: o } = await admin.from('orders').select('*, order_items(*)').eq('id', orderId).maybeSingle();
  if (!o) return null;
  const [{ data: prof }, { data: u }] = await Promise.all([
    admin.from('profiles').select('full_name, phone').eq('id', o.user_id).maybeSingle(),
    admin.auth.admin.getUserById(o.user_id),
  ]);
  const items = (o.order_items ?? []) as { name: string; size: string; unit_price_cents: number; quantity: number }[];
  const produtos = items
    .map((it) => `• ${it.name} (tam. ${it.size}) x${it.quantity} = ${brl(it.unit_price_cents * it.quantity)}`)
    .join('\n');
  const presente = o.is_gift
    ? `\n🎁 Embalagem de presente\nDe: ${o.gift_from ?? '—'}\nPara: ${o.gift_to ?? '—'}${o.gift_message ? `\nMensagem: ${o.gift_message}` : ''}\n`
    : '';
  const first = String(prof?.full_name || o.address?.recipient || 'cliente').trim().split(/\s+/)[0];
  return {
    phone: normalizeBrPhone(prof?.phone ?? o.address?.phone),
    email: u?.user?.email ?? null,
    vars: {
      pedido: String(o.number),
      nome: first,
      valor: brl(o.total_cents),
      produtos,
      entrega: SHIP_LABEL[o.shipping_method] ?? o.shipping_name,
      previsao: formatDateBR(o.estimated_delivery),
      pagamento: PAY_LABEL[o.payment_method ?? ''] ?? 'A definir',
      presente,
      rastreio: o.tracking_code ?? 'em breve',
      link: `${SITE.url}/pedido/${o.id}`,
    },
  };
}

/** Texto pronto (e-mail e WhatsApp) — também usado pelo botão "Enviar pelo WhatsApp" do admin. */
export async function renderOrderMessages(orderId: string, event: NotifyEvent) {
  const admin = createAdminClient();
  const [b, { data: t }] = await Promise.all([
    build(orderId),
    admin.from('message_templates').select('*').eq('key', event).maybeSingle(),
  ]);
  if (!b || !t) return null;
  return {
    built: b,
    tpl: t,
    emailSubject: renderTemplate(t.email_subject, b.vars),
    emailBody: renderTemplate(t.email_body, b.vars),
    whatsappBody: renderTemplate(t.whatsapp_body, b.vars),
  };
}

async function sendEmail(to: string, subject: string, text: string): Promise<string> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) throw new Error('skip:Resend não configurado');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, text }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}`);
  return 'ok';
}

/**
 * WhatsApp Cloud API (Meta). Mensagens iniciadas pela loja EXIGEM modelo (template) aprovado.
 * Parâmetros do corpo, na ordem: {{1}} pedido, {{2}} valor, {{3}} produtos, {{4}} entrega, {{5}} previsão.
 */
async function sendWhatsApp(phone: string, event: NotifyEvent, vars: Record<string, string>): Promise<string> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  const tplName = {
    order_paid: process.env.WHATSAPP_TEMPLATE_ORDER_PAID,
    order_created: process.env.WHATSAPP_TEMPLATE_ORDER_CREATED,
    order_shipped: process.env.WHATSAPP_TEMPLATE_ORDER_SHIPPED,
  }[event];
  if (!token || !phoneId || !tplName) throw new Error('skip:WhatsApp Cloud não configurado');
  const params = [vars.pedido, vars.valor, vars.produtos, vars.entrega, vars.previsao].map((t) => ({
    type: 'text',
    text: sanitizeWaParam(t || '-'),
  }));
  const res = await fetch(`https://graph.facebook.com/v21.0/${encodeURIComponent(phoneId)}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: phone,
      type: 'template',
      template: { name: tplName, language: { code: 'pt_BR' }, components: [{ type: 'body', parameters: params }] },
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`WhatsApp ${res.status}`);
  return 'ok';
}

/** Envia (no máximo uma vez por pedido/evento/canal). Nunca lança: falha de aviso não derruba o pagamento. */
export async function notifyOrder(orderId: string, event: NotifyEvent): Promise<void> {
  try {
    const admin = createAdminClient();
    const m = await renderOrderMessages(orderId, event);
    if (!m) return;

    const channels: { channel: 'email' | 'whatsapp'; enabled: boolean; run: () => Promise<string> }[] = [
      {
        channel: 'email',
        enabled: !!m.tpl.email_enabled && !!m.built.email,
        run: () => sendEmail(m.built.email!, m.emailSubject, m.emailBody),
      },
      {
        channel: 'whatsapp',
        enabled: !!m.tpl.whatsapp_enabled && !!m.built.phone,
        run: () => sendWhatsApp(m.built.phone!, event, m.built.vars),
      },
    ];

    for (const c of channels) {
      const { data: prev } = await admin
        .from('notification_log').select('status').eq('order_id', orderId).eq('event', event).eq('channel', c.channel).maybeSingle();
      if (prev?.status === 'sent' || prev?.status === 'skipped') continue;

      let status: 'sent' | 'failed' | 'skipped' = 'sent';
      let detail: string | null = null;
      if (!c.enabled) {
        status = 'skipped'; detail = 'canal desativado ou sem contato';
      } else {
        try { await c.run(); } catch (e) {
          const msg = e instanceof Error ? e.message : 'erro';
          if (msg.startsWith('skip:')) { status = 'skipped'; detail = msg.slice(5); } else { status = 'failed'; detail = msg; }
        }
      }
      await admin.from('notification_log').upsert(
        { order_id: orderId, event, channel: c.channel, status, detail },
        { onConflict: 'order_id,event,channel' },
      );
    }
  } catch (e) {
    console.error('[notify]', event, orderId, e instanceof Error ? e.message : e);
  }
}
