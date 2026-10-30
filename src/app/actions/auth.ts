'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { loginSchema, signupSchema } from '@/lib/validators';
import { safeNext } from '@/lib/utils';
import { SITE } from '@/lib/constants';

export type FormState = { error?: string; message?: string } | undefined;

const DEMO_MSG = 'A loja está em modo demonstração. Configure o Supabase (veja o DEPLOY.md) para ativar o login.';

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!isSupabaseConfigured) return { error: DEMO_MSG };
  const parsed = loginSchema.safeParse({ email: formData.get('email'), password: formData.get('password') });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  // Mensagem genérica: não revela se o e-mail existe.
  if (error) return { error: 'E-mail ou senha incorretos.' };

  redirect(safeNext(formData.get('next')));
}

export async function signup(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!isSupabaseConfigured) return { error: DEMO_MSG };
  const parsed = signupSchema.safeParse({
    name: formData.get('name'),
    phone: formData.get('phone'),
    accept: formData.get('accept'),
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };

  const next = safeNext(formData.get('next'));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.name, phone: parsed.data.phone, accepted_terms_at: new Date().toISOString() },
      emailRedirectTo: `${SITE.url}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) return { error: 'Não foi possível criar a conta. Verifique os dados e tente novamente.' };

  // Sem confirmação de e-mail ativa: já vem logado.
  if (data.session) redirect(next);
  return { message: 'Conta criada! Enviamos um e-mail de confirmação — confirme e depois faça login. 💌' };
}

export async function signInWithGoogle(formData: FormData) {
  if (!isSupabaseConfigured) redirect('/entrar');
  const next = safeNext(formData.get('next'));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${SITE.url}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error || !data.url) redirect('/entrar?erro=google');
  redirect(data.url);
}

export async function logout() {
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect('/');
}
