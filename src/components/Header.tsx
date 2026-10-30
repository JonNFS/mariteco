import Link from 'next/link';
import { LayoutDashboard, LogOut, Search, ShoppingBag, User } from 'lucide-react';
import { Logo } from './Logo';
import { MobileMenu } from './MobileMenu';
import { NAV_LINKS } from '@/lib/constants';
import { getCartCount } from '@/lib/data';
import { getProfile, getUser } from '@/lib/auth';
import { logout } from '@/app/actions/auth';
import { brl } from '@/lib/utils';

export async function Header() {
  const user = await getUser();
  const [count, profile] = await Promise.all([getCartCount(user?.id), user ? getProfile() : null]);
  const threshold = Number(process.env.FREE_SHIPPING_THRESHOLD_CENTS ?? 0);
  const firstName = profile?.full_name?.split(' ')[0];

  return (
    <header className="sticky top-0 z-40">
      <div className="bg-gradient-to-r from-pink-400 via-pink-300 to-sky-400 py-1.5 text-center text-xs font-bold text-white sm:text-sm">
        <span className="inline-block animate-pulse">💙</span> Enviamos para todo o Brasil
        {threshold > 0 && <span className="hidden sm:inline"> · Frete grátis em compras acima de {brl(threshold)}</span>} 💖
      </div>

      <div className="border-b border-pink-100 bg-cream/85 backdrop-blur-xl">
        <div className="container-page flex h-16 items-center gap-3 sm:h-20 sm:gap-6">
          <MobileMenu links={NAV_LINKS} loggedIn={Boolean(user)} />
          <Logo priority />

          <nav className="ml-4 hidden items-center gap-7 lg:flex" aria-label="Principal">
            {NAV_LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="link-underline font-display text-base font-semibold text-ink-700 hover:text-pink-600">
                {l.label}
              </Link>
            ))}
          </nav>

          <form action="/loja" className="ml-auto hidden max-w-xs flex-1 md:block" role="search">
            <label className="relative block">
              <span className="sr-only">Buscar produtos</span>
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
              <input name="q" type="search" maxLength={60} placeholder="Buscar roupinhas…" className="input !rounded-full !py-2.5 pl-10 text-sm" />
            </label>
          </form>

          <div className="ml-auto flex items-center gap-1 sm:gap-2 md:ml-0">
            <Link href="/loja" className="btn btn-ghost btn-icon btn-sm md:hidden" aria-label="Buscar">
              <Search className="h-5 w-5" />
            </Link>

            {profile?.role === 'admin' && (
              <Link href="/admin" className="btn btn-ghost btn-icon btn-sm hidden sm:inline-flex" title="Painel admin">
                <LayoutDashboard className="h-5 w-5" /> <span className="hidden xl:inline">Admin</span>
              </Link>
            )}

            {user ? (
              <>
                <Link href="/conta" className="btn btn-ghost btn-icon btn-sm" aria-label="Minha conta">
                  <User className="h-5 w-5" />
                  <span className="hidden lg:inline">{firstName ? `Oi, ${firstName}` : 'Minha conta'}</span>
                </Link>
                <form action={logout} className="hidden sm:block">
                  <button className="btn btn-ghost btn-icon btn-sm" aria-label="Sair" title="Sair">
                    <LogOut className="h-5 w-5" />
                  </button>
                </form>
              </>
            ) : (
              <Link href="/entrar" className="btn btn-soft btn-icon btn-sm">
                <User className="h-5 w-5" /> Entrar
              </Link>
            )}

            <Link href="/sacola" className="btn btn-primary btn-icon btn-sm relative !px-3.5" aria-label={`Sacola, ${count} itens`}>
              <ShoppingBag className="h-5 w-5" />
              {count > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 animate-pop items-center justify-center rounded-full bg-sky-500 px-1 text-[11px] font-extrabold text-white ring-2 ring-cream">
                  {count}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
