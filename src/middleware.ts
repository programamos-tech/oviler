import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getNouInternalAllowlistSize, isNouInternalStaff, isSuperAdminLicenseExempt } from '@/lib/nou-internal'

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

  const pathStr = request.nextUrl.pathname
  const path = pathStr
  const isInternalRoute = path.startsWith('/interno') || path.startsWith('/api/internal')

  if (isInternalRoute) {
    // #region agent log
    let profileEmail: string | null = null
    if (user) {
      const { data: profileRow } = await supabase
        .from('users')
        .select('email')
        .eq('id', user.id)
        .maybeSingle()
      profileEmail = (profileRow as { email?: string | null } | null)?.email ?? null
    }
    const allowedSize = getNouInternalAllowlistSize()
    const staffOk = user ? (isNouInternalStaff(user.email) || isNouInternalStaff(profileEmail)) : false
    const payload = {
      sessionId: 'b5a8bd',
      location: 'middleware.ts:internal-gate',
      message: 'interno route access check',
      data: {
        hypothesisId: 'H1-H5',
        path,
        isApi: path.startsWith('/api/'),
        hasUser: Boolean(user),
        hasEmail: Boolean(user?.email),
        emailLen: user?.email?.length ?? 0,
        hasProfileEmail: Boolean(profileEmail),
        allowedSize,
        staffOk,
      },
      timestamp: Date.now(),
      runId: 'pre-fix',
    }
    void fetch('http://127.0.0.1:7686/ingest/32bc7982-fea9-4353-bdfe-2501fd166c24', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'b5a8bd' },
      body: JSON.stringify(payload),
    }).catch(() => {})
    console.log('[NOU_DEBUG_INTERN]', JSON.stringify(payload.data))
    // #endregion

    if (!user) {
      if (path.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return redirectWithCookies(url, cookiesFromSetAll)
    }
    if (!staffOk) {
      if (path.startsWith('/api/')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return redirectWithCookies(url, cookiesFromSetAll)
    }
  }

  // Rutas públicas (páginas)
  const isCatalogPublic =
    pathStr.startsWith('/t/') || pathStr === '/t'
  const publicPaths = ['/login', '/registro', '/']
  const isPublicPath =
    isCatalogPublic ||
    publicPaths.some((path) => pathStr === path || pathStr.startsWith(path + '/'))

  // APIs que deben funcionar sin sesión (registro de nueva cuenta)
  const publicApiPaths = ['/api/admin/create-user', '/api/auth/create-organization']
  const isPublicApi =
    publicApiPaths.some((path) => pathStr === path) || pathStr.startsWith('/api/catalog/')

  // Usuario con sesión pero licencia bloqueada: puede validar clave sin redirigir al modal de bloqueo
  const licenseUnlockApi = request.nextUrl.pathname === '/api/auth/unlock-license'

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

  // Trial vencido o licencia suspendida/cancelada (no aplica a staff NOU ni rutas internas ni catálogo público)
  if (
    user &&
    !isPublicPath &&
    !isPublicApi &&
    !licenseUnlockApi &&
    path !== '/acceso-bloqueado' &&
    !isInternalRoute &&
    !isCatalogPublic &&
    !isSuperAdminLicenseExempt(user.email ?? '')
  ) {
    const { data: me } = await supabase.from('users').select('organization_id').eq('id', user.id).maybeSingle()
    if (me?.organization_id) {
      const { data: org } = await supabase
        .from('organizations')
        .select('plan_type, trial_ends_at, subscription_status')
        .eq('id', me.organization_id)
        .maybeSingle()
      if (org) {
        const licenciaBloqueada =
          org.subscription_status === 'suspended' || org.subscription_status === 'cancelled'
        const trialVencido =
          org.plan_type === 'free' &&
          org.trial_ends_at &&
          new Date(org.trial_ends_at).getTime() < Date.now()
        if (licenciaBloqueada || trialVencido) {
          const url = request.nextUrl.clone()
          url.pathname = '/acceso-bloqueado'
          url.searchParams.set('motivo', trialVencido ? 'trial' : 'licencia')
          return redirectWithCookies(url, cookiesFromSetAll)
        }
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
