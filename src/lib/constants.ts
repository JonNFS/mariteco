export const SITE = {
  name: 'Mariteco',
  tagline: 'Vestindo alegria, pureza e amor',
  description:
    'Moda infantil cheia de carinho: roupas, calçados e acessórios para meninas e meninos. Enviamos para todo o Brasil. Maceió - AL.',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  whatsapp: (process.env.NEXT_PUBLIC_WHATSAPP ?? '558296332203').replace(/\D/g, ''),
  phoneDisplay: '+55 82 9633-2203',
  instagram: 'https://www.instagram.com/maritecoloja/',
  tiktok: 'https://www.tiktok.com/@maritecoloja',
  handle: '@maritecoloja',
  address: {
    line1: 'Rua Vereador Dário Marsíglia, 27',
    neighborhood: 'Tabuleiro Martins',
    city: 'Maceió',
    state: 'AL',
    cep: '57081-015',
  },
} as const;

export const GENDERS = [
  { value: 'menina', label: 'Menina' },
  { value: 'menino', label: 'Menino' },
  { value: 'unissex', label: 'Unissex' },
] as const;

export const SIZE_TYPES = [
  { value: 'roupa', label: 'Roupa' },
  { value: 'calcado', label: 'Calçado' },
  { value: 'unico', label: 'Tamanho único / acessório' },
] as const;

/** Grades prontas no cadastro de produto (o admin pode editar/adicionar livremente). */
export const SIZE_PRESETS: Record<string, { label: string; sizes: string[] }> = {
  bebe: { label: 'Roupa bebê (RN a G)', sizes: ['RN', 'P', 'M', 'G'] },
  bebe_meses: { label: 'Roupa bebê (meses)', sizes: ['0-3m', '3-6m', '6-9m', '9-12m', '12-18m'] },
  infantil: { label: 'Roupa infantil (1 a 16)', sizes: ['1', '2', '3', '4', '6', '8', '10', '12', '14', '16'] },
  calcado_bebe: { label: 'Calçado bebê (15 a 21)', sizes: ['15', '16', '17', '18', '19', '20', '21'] },
  calcado_infantil: { label: 'Calçado infantil (22 a 35)', sizes: ['22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '32', '33', '34', '35'] },
  unico: { label: 'Tamanho único', sizes: ['Único'] },
};

export const NAV_LINKS = [
  { href: '/loja?genero=menina', label: 'Meninas' },
  { href: '/loja?genero=menino', label: 'Meninos' },
  { href: '/loja?categoria=calcados', label: 'Calçados' },
  { href: '/loja?categoria=bebes', label: 'Bebês' },
  { href: '/loja?categoria=acessorios', label: 'Acessórios' },
];

export const ORDER_STATUS: Record<string, { label: string; tone: string }> = {
  aguardando_pagamento: { label: 'Aguardando pagamento', tone: 'bg-sun-100 text-amber-700' },
  pago: { label: 'Pago', tone: 'bg-mint-100 text-emerald-700' },
  em_separacao: { label: 'Em separação', tone: 'bg-sky-100 text-sky-700' },
  enviado: { label: 'Enviado', tone: 'bg-sky-200 text-sky-700' },
  entregue: { label: 'Entregue', tone: 'bg-mint-300/50 text-emerald-800' },
  cancelado: { label: 'Cancelado', tone: 'bg-ink-100 text-ink-500' },
};

export const ORDER_STATUS_LIST = Object.keys(ORDER_STATUS);

export const UFS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
] as const;
