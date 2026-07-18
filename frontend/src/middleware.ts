import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Middleware de Next.js.
 * - Refresca la sesión de Supabase en cada request.
 * - Redirige a /login si el usuario no está autenticado en rutas protegidas.
 */
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refrescar sesión (no usar getSession por seguridad)
  const { data: { user } } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // Rutas que requieren autenticación (cualquier rol)
  const protectedRoutes = ['/mi-cuenta', '/mis-pedidos', '/checkout'];
  // Rutas que requieren autenticación (redirigir si no está logueado; el rol lo chequea el layout)
  const adminRoutes     = ['/admin'];

  const needsAuth = protectedRoutes.some(r => path.startsWith(r)) ||
                    adminRoutes.some(r => path.startsWith(r));

  if (needsAuth && !user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', path);
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/mi-cuenta/:path*',
    '/mis-pedidos/:path*',
    '/checkout/:path*',
    '/admin/:path*',
  ],
};
