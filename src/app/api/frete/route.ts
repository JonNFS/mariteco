import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { lookupCep } from '@/lib/cep';
import { calculateShipping } from '@/lib/shipping';
import { cartTotals, getCart } from '@/lib/cart';
import { rateLimit } from '@/lib/rate-limit';
import { cepSchema, uuidSchema } from '@/lib/validators';

const bodySchema = z.object({
  cep: cepSchema,
  // calcular para um produto (página do produto) ou para a sacola inteira (checkout)
  productId: uuidSchema.optional(),
  quantity: z.number().int().min(1).max(20).optional().default(1),
});

/** Calcular frete exige login (como pedido). */
export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured) return NextResponse.json({ error: 'Modo demonstração' }, { status: 503 });

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: 'Faça login para calcular o frete.', needsLogin: true }, { status: 401 });

  if (!rateLimit(`frete:${auth.user.id}`, 30, 60_000)) {
    return NextResponse.json({ error: 'Muitas consultas. Aguarde um instante.' }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'CEP inválido' }, { status: 400 });
  const { cep, productId, quantity } = parsed.data;

  let subtotalCents = 0;
  let weightGrams = 0;

  if (productId) {
    const { data: p } = await supabase.from('products').select('price_cents, weight_grams').eq('id', productId).maybeSingle();
    if (!p) return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
    subtotalCents = p.price_cents * quantity;
    weightGrams = p.weight_grams * quantity;
  } else {
    const t = cartTotals(await getCart(auth.user.id));
    subtotalCents = t.subtotalCents;
    weightGrams = t.weightGrams;
    if (t.count === 0) return NextResponse.json({ error: 'Sacola vazia' }, { status: 400 });
  }

  const address = await lookupCep(cep);
  if (!address) return NextResponse.json({ error: 'CEP não encontrado' }, { status: 404 });

  const { options } = calculateShipping({ cep, subtotalCents, weightGrams });
  return NextResponse.json({ address, options });
}
