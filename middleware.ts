import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isAdminEmail } from '@/lib/auth/admin'
import { safeInternalNextPath } from '@/lib/auth/safeNextPath'
import { takeRateLimit } from '@/lib/security/rateLimit'
import { isCronBearerAuthorized } from '@/lib/security/cronAuth'
import {
  applyEdgeRateLimit,
  csrfBlocked,
  requiresApiLogin,
} from '@/lib/security/middlewarePolicy'

const PROTECTED = ['/mypage', '/manage', '/admin', '/billing']

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  const method = request.method

  /** 공개 GET API — IP별 남용 방지 */
  if (method === 'GET' && path === '/api/home/recommendations') {
    const rate = takeRateLimit(request, 'api:home:recommendations', { windowMs: 60_000, max: 120 })
    if (!rate.ok) {
      return NextResponse.json(
        { ok: false, error: '요청이 너무 많습니다.' },
        { status: 429, headers: { 'Retry-After': String(rate.retryAfterSec) } }
      )
    }
    return NextResponse.next()
  }

  if (method === 'GET' && path === '/api/programs/trending') {
    const rate = takeRateLimit(request, 'api:programs:trending', { windowMs: 60_000, max: 120 })
    if (!rate.ok) {
      return NextResponse.json(
        { ok: false, error: '요청이 너무 많습니다.' },
        { status: 429, headers: { 'Retry-After': String(rate.retryAfterSec) } }
      )
    }
    return NextResponse.next()
  }

  const edgeRate = applyEdgeRateLimit(request, path)
  if (edgeRate) return edgeRate

  if (csrfBlocked(request, path, method)) {
    return NextResponse.json(
      { error: '잘못된 요청 출처입니다.', error_code: 'CSRF_ORIGIN_MISMATCH' },
      { status: 403 }
    )
  }

  const needsSession = PROTECTED.some((p) => path.startsWith(p)) || requiresApiLogin(path)
  const isAdminPath = path.startsWith('/admin')
  const isAdminApiPath = path.startsWith('/api/admin')
  const isAdminArea = isAdminPath || isAdminApiPath
  const cronSyncBypass = path.startsWith('/api/admin/sync') && isCronBearerAuthorized(request)

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (needsSession && !user) {
    if (path.startsWith('/api/')) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.', error_code: 'AUTH_REQUIRED' },
        { status: 401 }
      )
    }
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', safeInternalNextPath(path))
    return NextResponse.redirect(url)
  }

  if (isAdminArea && !cronSyncBypass) {
    if (!isAdminEmail(user?.email)) {
      if (path.startsWith('/api/')) {
        return NextResponse.json(
          { error: '관리자 권한이 필요합니다.', error_code: 'AUTH_ADMIN_REQUIRED' },
          { status: 403 }
        )
      }
      const url = request.nextUrl.clone()
      url.pathname = '/'
      url.searchParams.set('error', 'admin_only')
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/mypage/:path*',
    '/manage/:path*',
    '/admin/:path*',
    '/billing/:path*',
    '/api/admin/:path*',
    '/api/home/recommendations',
    '/api/programs/trending',
    '/api/query/parse',
    '/api/search',
    '/api/eligibility',
    '/api/diagnosis/session',
    '/api/contact',
    '/api/feedback',
    '/api/documents/:path*',
    '/api/evaluate/:path*',
    '/api/export/:path*',
    '/api/billing/:path*',
  ],
}
