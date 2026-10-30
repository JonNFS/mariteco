/** Renderização das mensagens (e-mail / WhatsApp) com {placeholders}. Pura e testável. */
export const PLACEHOLDERS = [
  ['{pedido}', 'Número do pedido'],
  ['{nome}', 'Primeiro nome do cliente'],
  ['{valor}', 'Valor total (R$ 199,90)'],
  ['{produtos}', 'Lista de produtos com preço'],
  ['{entrega}', 'Tipo de entrega (Retirada, Envio rápido…)'],
  ['{previsao}', 'Data prevista de entrega'],
  ['{pagamento}', 'Forma de pagamento'],
  ['{presente}', 'Bloco do presente (De/Para/mensagem), vazio se não for presente'],
  ['{rastreio}', 'Código de rastreio'],
  ['{link}', 'Link do pedido na conta'],
] as const;

export type TemplateVars = Record<string, string>;

export function renderTemplate(tpl: string, vars: TemplateVars): string {
  return tpl
    .replace(/\{([a-z_]+)\}/g, (_, k: string) => vars[k] ?? '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** WhatsApp (modelo aprovado pela Meta) não aceita quebra de linha nem 4 espaços seguidos nos parâmetros. */
export function sanitizeWaParam(s: string): string {
  return s.replace(/[\r\n\t]+/g, ' | ').replace(/ {4,}/g, '   ').replace(/( \| ){2,}/g, ' | ').trim().slice(0, 1000);
}

export function normalizeBrPhone(raw: string | null | undefined): string | null {
  const d = (raw ?? '').replace(/\D/g, '');
  if (d.length === 10 || d.length === 11) return `55${d}`;
  if ((d.length === 12 || d.length === 13) && d.startsWith('55')) return d;
  return null;
}
