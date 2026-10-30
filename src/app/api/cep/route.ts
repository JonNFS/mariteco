import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { lookupCep } from '@/lib/cep';
import { rateLimit } from '@/lib/rate-limit';
import { cepSchema } from '@/lib/validators';

/** Preenche o endereço a partir do CEP (somente logado). */
export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured) return NextResponse.json({ error: 'Modo demonstração' }, { status: 503 });
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: 'Faça login.' }, { status: 401 });
  if (!rateLimit(`cep:${auth.user.id}`, 40, 60_000)) return NextResponse.json({ error: 'Muitas consultas.' }, { status: 429 });

  const cep = cepSchema.safeParse(request.nextUrl.searchParams.get('cep') ?? '');
  if (!cep.success) return NextResponse.json({ error: 'CEP inválido' }, { status: 400 });
  const address = await lookupCep(cep.data);
  if (!address) return NextResponse.json({ error: 'CEP não encontrado' }, { status: 404 });
  return NextResponse.json({ address });
}
