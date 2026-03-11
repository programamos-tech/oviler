import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

type CookieEntry = { name: string; value: string; options?: Record<string, unknown> }

/** Copia las cookies que Supabase pidió guardar al redirect para no perder la sesión */
function redirectWithCookies(url: URL, cookiesFromSetAll: CookieEntry[]) {
  const res = NextResponse.redirect(url)
  cookiesFromSetAll.forEach(({ name, value, options }) =>
    res.cookies.set(name, value, (options as { path?: string }) ?? { path: '/' })
  )
  return res
}

export async function middleware(request: NextRequest) {
  const supabaseResponse = NextResponse.next({
    request,
  })
  const cookiesFromSetAll: CookieEntry[] = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: CookieEntry[]) {
          cookiesToSet.forEach((c) => {
            cookiesFromSetAll.push(c)
            supabaseResponse.cookies.set(c.name, c.value, c.options ?? {})
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Rutas públicas (páginas)
  const publicPaths = ['/login', '/registro', '/']
  const isPublicPath = publicPaths.some((path) => request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(path + '/'))

  // APIs que deben funcionar sin sesión (registro de nueva cuenta)
  const publicApiPaths = ['/api/admin/create-user', '/api/auth/create-organization']
  const isPublicApi = publicApiPaths.some((path) => request.nextUrl.pathname === path)

  // Si no está autenticado y trata de acceder a ruta protegida, redirigir a login
  if (!user && !isPublicPath && !isPublicApi) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return redirectWithCookies(url, cookiesFromSetAll)
  }

  // Si está autenticado y trata de acceder a login o registro, verificar si necesita onboarding
  if (user && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/registro')) {
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (userData) {
      const { data: branches } = await supabase
        .from('branches')
        .select('id')
        .eq('organization_id', userData.organization_id)
        .limit(1)

      if (!branches || branches.length === 0) {
        const url = request.nextUrl.clone()
        url.pathname = '/onboarding'
        return redirectWithCookies(url, cookiesFromSetAll)
      } else {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return redirectWithCookies(url, cookiesFromSetAll)
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
