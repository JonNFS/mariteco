import 'server-only';

/**
 * CÁLCULO DE FRETE (por tabela de zonas) — origem: Maceió/AL.
 *
 * É uma ESTIMATIVA para a primeira versão. A interface (calculateShipping) foi feita para
 * você trocar depois por Melhor Envio / Correios / Frenet sem mexer no resto do site:
 * basta devolver a mesma lista de ShippingOption.
 */

export type ShippingOption = {
  id: 'retirada' | 'local' | 'economico' | 'expresso';
  name: string;
  description: string;
  priceCents: number;
  /** Prazo máximo estimado em dias úteis (já inclui 1 dia de preparo do pedido). */
  days: number;
};

const RANGES: [number, number, string][] = [
  [1000, 19999, 'SP'], [20000, 28999, 'RJ'], [29000, 29999, 'ES'], [30000, 39999, 'MG'],
  [40000, 48999, 'BA'], [49000, 49999, 'SE'], [50000, 56999, 'PE'], [57000, 57999, 'AL'],
  [58000, 58999, 'PB'], [59000, 59999, 'RN'], [60000, 63999, 'CE'], [64000, 64999, 'PI'],
  [65000, 65999, 'MA'], [66000, 68899, 'PA'], [68900, 68999, 'AP'], [69000, 69299, 'AM'],
  [69300, 69399, 'RR'], [69400, 69899, 'AM'], [69900, 69999, 'AC'], [70000, 72799, 'DF'],
  [72800, 72999, 'GO'], [73000, 73699, 'DF'], [73700, 76799, 'GO'], [76800, 76999, 'RO'],
  [77000, 77999, 'TO'], [78000, 78899, 'MT'], [78900, 78999, 'RO'], [79000, 79999, 'MS'],
  [80000, 87999, 'PR'], [88000, 89999, 'SC'], [90000, 99999, 'RS'],
];

export function ufFromCep(cep: string): string | null {
  const n = parseInt(cep.slice(0, 5), 10);
  if (Number.isNaN(n)) return null;
  return RANGES.find(([a, b]) => n >= a && n <= b)?.[2] ?? null;
}

const NORDESTE = ['BA', 'SE', 'PE', 'PB', 'RN', 'CE', 'PI', 'MA'];
const SUDESTE_CO = ['SP', 'RJ', 'ES', 'MG', 'DF', 'GO', 'MT', 'MS'];

type Tier = { base: number; per500: number; days: number };
type ZoneTable = { economico: Tier; expresso: Tier };

const ZONES: Record<'AL' | 'NE' | 'SE_CO' | 'S_N', ZoneTable> = {
  AL: { economico: { base: 1890, per500: 300, days: 4 }, expresso: { base: 2890, per500: 450, days: 2 } },
  NE: { economico: { base: 2490, per500: 400, days: 7 }, expresso: { base: 3990, per500: 600, days: 4 } },
  SE_CO: { economico: { base: 3290, per500: 500, days: 8 }, expresso: { base: 5490, per500: 800, days: 5 } },
  S_N: { economico: { base: 3990, per500: 600, days: 10 }, expresso: { base: 6990, per500: 1000, days: 6 } },
};

const LOCAL_MOTO_CENTS = 990;

function tierPrice(t: Tier, weightGrams: number) {
  const extra = Math.max(0, Math.ceil((weightGrams - 500) / 500));
  return t.base + extra * t.per500;
}

export function calculateShipping(input: {
  cep: string; // 8 dígitos
  subtotalCents: number;
  weightGrams: number;
}): { uf: string | null; options: ShippingOption[] } {
  const uf = ufFromCep(input.cep);
  if (!uf) return { uf: null, options: [] };

  const threshold = Number(process.env.FREE_SHIPPING_THRESHOLD_CENTS ?? 0);
  const free = threshold > 0 && input.subtotalCents >= threshold;
  const weight = Math.max(input.weightGrams, 100);
  const options: ShippingOption[] = [];

  const n = parseInt(input.cep.slice(0, 5), 10);
  const isMaceio = uf === 'AL' && n >= 57000 && n <= 57099;

  if (isMaceio) {
    options.push({
      id: 'retirada',
      name: 'Retirar na loja',
      description: 'Grátis — Tabuleiro Martins, Maceió. Avisamos quando estiver pronto.',
      priceCents: 0,
      days: 1,
    });
    options.push({
      id: 'local',
      name: 'Entrega em Maceió',
      description: 'Entregador (moto) direto na sua casa.',
      priceCents: free ? 0 : LOCAL_MOTO_CENTS,
      days: 2,
    });
  }

  const zone: keyof typeof ZONES =
    uf === 'AL' ? 'AL' : NORDESTE.includes(uf) ? 'NE' : SUDESTE_CO.includes(uf) ? 'SE_CO' : 'S_N';
  const z = ZONES[zone];

  if (!isMaceio) {
    options.push({
      id: 'economico',
      name: free ? 'Frete grátis' : 'Entrega econômica',
      description: 'Menor preço, via Correios/transportadora.',
      priceCents: free ? 0 : tierPrice(z.economico, weight),
      days: z.economico.days + 1,
    });
    options.push({
      id: 'expresso',
      name: 'Entrega expressa',
      description: 'Chega mais rápido.',
      priceCents: tierPrice(z.expresso, weight),
      days: z.expresso.days + 1,
    });
  }

  options.sort((a, b) => a.priceCents - b.priceCents || a.days - b.days);
  return { uf, options };
}
