'use client';

import { useActionState } from 'react';
import { Loader2 } from 'lucide-react';
import { updateProfile } from '@/app/actions/account';
import type { FormState } from '@/app/actions/auth';

export function ProfileForm({ name, phone, email }: { name: string; phone: string; email: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateProfile, undefined);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="p-name">Nome</label>
        <input id="p-name" name="name" defaultValue={name} required minLength={2} maxLength={80} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="p-email">E-mail</label>
        <input id="p-email" value={email} disabled className="input !bg-ink-100/50" />
      </div>
      <div>
        <label className="label" htmlFor="p-phone">Telefone / WhatsApp</label>
        <input id="p-phone" name="phone" defaultValue={phone} inputMode="tel" maxLength={20} placeholder="(82) 99999-9999" className="input" />
      </div>
      {state?.error && <p role="alert" className="rounded-2xl bg-pink-100 px-4 py-3 text-sm font-bold text-pink-700">{state.error}</p>}
      {state?.message && <p role="status" className="animate-pop rounded-2xl bg-mint-100 px-4 py-3 text-sm font-bold text-emerald-700">{state.message}</p>}
      <button className="btn btn-blue" disabled={pending}>{pending ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Salvar dados'}</button>
    </form>
  );
}
