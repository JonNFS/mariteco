'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { login, signup, signInWithGoogle, type FormState } from '@/app/actions/auth';
import { cn } from '@/lib/utils';

export function AuthForm({ next, initialTab }: { next: string; initialTab: 'login' | 'signup' }) {
  const [tab, setTab] = useState(initialTab);
  const [loginState, loginAction, loginPending] = useActionState<FormState, FormData>(login, undefined);
  const [signupState, signupAction, signupPending] = useActionState<FormState, FormData>(signup, undefined);

  return (
    <div>
      <div className="mb-6 grid grid-cols-2 rounded-full bg-pink-50 p-1.5" role="tablist">
        {(['login', 'signup'] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn('rounded-full py-2.5 font-display font-semibold transition-all duration-300', tab === t ? 'bg-white text-pink-600 shadow-soft' : 'text-ink-500 hover:text-pink-600')}
          >
            {t === 'login' ? 'Entrar' : 'Criar conta'}
          </button>
        ))}
      </div>

      {tab === 'login' ? (
        <form action={loginAction} className="space-y-4" key="login">
          <input type="hidden" name="next" value={next} />
          <div>
            <label className="label" htmlFor="l-email">E-mail</label>
            <input id="l-email" name="email" type="email" required autoComplete="email" className="input" placeholder="voce@email.com" />
          </div>
          <div>
            <label className="label" htmlFor="l-pass">Senha</label>
            <input id="l-pass" name="password" type="password" required autoComplete="current-password" className="input" placeholder="Sua senha" />
          </div>
          {loginState?.error && <p role="alert" className="animate-pop rounded-2xl bg-pink-100 px-4 py-3 text-sm font-bold text-pink-700">{loginState.error}</p>}
          <button className="btn btn-primary btn-lg w-full" disabled={loginPending}>
            {loginPending ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Entrar'}
          </button>
        </form>
      ) : (
        <form action={signupAction} className="space-y-4" key="signup">
          <input type="hidden" name="next" value={next} />
          <div>
            <label className="label" htmlFor="s-name">Seu nome</label>
            <input id="s-name" name="name" required minLength={2} maxLength={80} autoComplete="name" className="input" placeholder="Maria da Silva" />
          </div>
          <div>
            <label className="label" htmlFor="s-phone">WhatsApp (com DDD)</label>
            <input id="s-phone" name="phone" type="tel" required inputMode="tel" autoComplete="tel" maxLength={20} className="input" placeholder="(82) 99999-9999" />
            <p className="mt-1 text-xs text-ink-500">Usado para avisar sobre o seu pedido.</p>
          </div>
          <div>
            <label className="label" htmlFor="s-email">E-mail</label>
            <input id="s-email" name="email" type="email" required autoComplete="email" className="input" placeholder="voce@email.com" />
          </div>
          <div>
            <label className="label" htmlFor="s-pass">Senha</label>
            <input id="s-pass" name="password" type="password" required minLength={8} maxLength={72} autoComplete="new-password" className="input" placeholder="Mínimo 8 caracteres, com letras e números" />
          </div>
          <label className="flex cursor-pointer items-start gap-3 text-sm text-ink-700">
            <input type="checkbox" name="accept" required className="mt-1 h-5 w-5 accent-pink-500" />
            <span>Li e aceito os <Link href="/termos" target="_blank" className="font-bold text-pink-600 underline">Termos</Link> e a <Link href="/privacidade" target="_blank" className="font-bold text-pink-600 underline">Política de Privacidade</Link>.</span>
          </label>
          {signupState?.error && <p role="alert" className="animate-pop rounded-2xl bg-pink-100 px-4 py-3 text-sm font-bold text-pink-700">{signupState.error}</p>}
          {signupState?.message && <p role="status" className="animate-pop rounded-2xl bg-mint-100 px-4 py-3 text-sm font-bold text-emerald-700">{signupState.message}</p>}
          <button className="btn btn-blue btn-lg w-full" disabled={signupPending}>
            {signupPending ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Criar minha conta'}
          </button>
        </form>
      )}

      <div className="my-6 flex items-center gap-3 text-xs font-bold uppercase tracking-wider text-ink-300">
        <span className="h-px flex-1 bg-ink-100" /> ou <span className="h-px flex-1 bg-ink-100" />
      </div>
      <p className="mb-3 text-center text-xs text-ink-500">Ao continuar com o Google, você concorda com os <Link href="/termos" className="underline">Termos</Link> e a <Link href="/privacidade" className="underline">Política de Privacidade</Link>.</p>
      <form action={signInWithGoogle}>
        <input type="hidden" name="next" value={next} />
        <button className="btn btn-soft w-full">
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
            <path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.5c2.1-1.9 3.4-4.7 3.4-8Z" />
            <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.5-2.7c-1 .7-2.3 1.1-3.8 1.1-2.9 0-5.4-2-6.3-4.6H2.1v2.8A11 11 0 0 0 12 23Z" />
            <path fill="#FBBC05" d="M5.7 14.1a6.6 6.6 0 0 1 0-4.2V7.1H2.1a11 11 0 0 0 0 9.8l3.6-2.8Z" />
            <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.3 1.7l3.2-3.2A11 11 0 0 0 2.1 7.1l3.6 2.8C6.6 7.4 9.1 5.4 12 5.4Z" />
          </svg>
          Continuar com Google
        </button>
      </form>
    </div>
  );
}
