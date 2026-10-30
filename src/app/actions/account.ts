'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import type { FormState } from './auth';

const schema = z.object({
  name: z.string().trim().min(2, 'Informe seu nome').max(80),
  phone: z.string().trim().max(20).transform((v) => v.replace(/\D/g, '')).refine((v) => v === '' || (v.length >= 10 && v.length <= 13), 'Telefone inválido'),
});

export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = schema.safeParse({ name: formData.get('name'), phone: formData.get('phone') ?? '' });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { error: 'Sessão expirada. Entre novamente.' };

  // Só full_name e phone podem ser alterados (o "role" não tem permissão de UPDATE no banco).
  const { error } = await supabase.from('profiles').update({ full_name: parsed.data.name, phone: parsed.data.phone || null }).eq('id', data.user.id);
  if (error) return { error: 'Não foi possível salvar.' };
  revalidatePath('/', 'layout');
  return { message: 'Dados salvos! 💖' };
}
