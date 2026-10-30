import 'server-only';
import { cache } from 'react';
import { notFound, redirect } from 'next/navigation';
import { createClient } from './supabase/server';
import { isSupabaseConfigured } from './supabase/config';

/** Usuário autenticado (validado no servidor do Supabase) ou null. */
export const getUser = cache(async () => {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
});

export const getProfile = cache(async () => {
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase.from('profiles').select('id, full_name, phone, role').eq('id', user.id).maybeSingle();
  return data ? { ...data, email: user.email ?? '' } : null;
});

export async function requireUser(nextPath = '/') {
  const user = await getUser();
  if (!user) redirect(`/entrar?next=${encodeURIComponent(nextPath)}`);
  return user;
}

/** Só admin passa. Quem não é admin recebe 404 (não revela que a área existe). */
export async function requireAdmin() {
  const user = await requireUser('/admin');
  const profile = await getProfile();
  if (profile?.role !== 'admin') notFound();
  return user;
}
