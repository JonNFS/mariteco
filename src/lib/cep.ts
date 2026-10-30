import 'server-only';
import { onlyDigits } from './utils';
import { ufFromCep } from './shipping';

export type CepAddress = {
  cep: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
};

/** Consulta o ViaCEP (host fixo, CEP validado com 8 dígitos). Falhou? devolve só o estado pela faixa do CEP. */
export async function lookupCep(rawCep: string): Promise<CepAddress | null> {
  const cep = onlyDigits(rawCep);
  if (!/^\d{8}$/.test(cep)) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
      signal: AbortSignal.timeout(4000),
      next: { revalidate: 60 * 60 * 24 },
    });
    if (!res.ok) throw new Error('viacep');
    const d = (await res.json()) as Record<string, string | boolean>;
    if (d.erro) return null;
    return {
      cep,
      street: String(d.logradouro ?? ''),
      neighborhood: String(d.bairro ?? ''),
      city: String(d.localidade ?? ''),
      state: String(d.uf ?? ufFromCep(cep) ?? ''),
    };
  } catch {
    const uf = ufFromCep(cep);
    return uf ? { cep, street: '', neighborhood: '', city: '', state: uf } : null;
  }
}
