import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from '@/lib/supabase/config';

/** Rotas que exigem login. (/admin ainda confere o papel "admin" no servidor.) */
const PROTECTED = ['/checkout', '/conta', '/sacola', '/pedido', '/admin'];

export async function proxy(request: NextRequest) {
  if (!isSupabaseConfigured) return NextResponse.next({ request });

  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // getUser() valida o token no servidor do Supabase (não confie em getSession() para proteger rotas).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;
  const needsLogin = PROTECTED.some((p) => pathname === p || pathname.startsWith(p + '/'));

  if (!user && needsLogin) {
    const url = request.nextUrl.clone();
    url.pathname = '/entrar';
    url.search = '';
    url.searchParams.set('next', pathname + search);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|brand/|demo/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)$).*)'],
};
