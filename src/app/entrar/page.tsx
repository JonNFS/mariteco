import type { Metadata } from 'next';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { AuthForm } from '@/components/AuthForm';
import { Blob, Sparkle } from '@/components/Decor';
import { getUser } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { safeNext } from '@/lib/utils';

export const metadata: Metadata = { title: 'Entrar', robots: { index: false } };

const MOTIVOS: Record<string, string> = {
  compra: 'Para comprar, entre na sua conta ou crie uma rapidinho 💖',
  frete: 'Entre na sua conta para calcular o frete 🚚',
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; motivo?: string; aba?: string; erro?: string }> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  if (await getUser()) redirect(next);

  const banner = sp.erro === 'link' ? 'O link de confirmação expirou. Tente entrar ou criar a conta novamente.' : sp.erro === 'google' ? 'Não foi possível entrar com o Google agora.' : sp.motivo ? MOTIVOS[sp.motivo] : null;

  return (
    <div className="relative overflow-hidden">
      <Blob tone="pink" className="-left-20 top-0 h-[26rem] w-[26rem] animate-floatSlow" />
      <Blob tone="sky" className="-right-20 bottom-0 h-[26rem] w-[26rem] animate-floatSlow [animation-delay:-5s]" />
      <Sparkle className="left-[15%] top-20 h-6 w-6 animate-float text-sun-500" />
      <div className="container-page grid min-h-[70vh] items-center gap-10 py-12 lg:grid-cols-2">
        <div className="hidden text-center lg:block">
          <Image src="/brand/logo-full.png" alt="Mariteco" width={496} height={336} priority className="mx-auto w-full max-w-md animate-float" />
          <p className="mt-6 font-display text-2xl font-semibold text-ink-700">Vestindo alegria, pureza e amor 💙</p>
        </div>

        <div className="card mx-auto w-full max-w-md animate-pop p-6 sm:p-8">
          <h1 className="font-display text-3xl font-bold text-ink-900">Bem-vindo(a)! 👋</h1>
          <p className="mb-5 mt-1 text-ink-500">Entre para comprar, calcular o frete e acompanhar seus pedidos.</p>
          {banner && <p role="status" className="mb-5 rounded-2xl bg-sky-100 px-4 py-3 text-sm font-bold text-sky-700">{banner}</p>}
          {!isSupabaseConfigured && (
            <p className="mb-5 rounded-2xl bg-sun-100 px-4 py-3 text-sm font-bold text-amber-700">Modo demonstração: conecte o Supabase para ativar o login (veja o DEPLOY.md).</p>
          )}
          <AuthForm next={next} initialTab={sp.aba === 'cadastro' ? 'signup' : 'login'} />
        </div>
      </div>
    </div>
  );
}
