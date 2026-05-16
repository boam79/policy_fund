import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { safeInternalNextPath } from '@/lib/auth/safeNextPath'
import { takeRateLimit } from '@/lib/security/rateLimit'

const PROTECTED = ['/mypage', '/manage', '/admin', '/billing']
const ADMIN_ONLY_EMAIL = (process.env.ADMIN_ONLY_EMAIL ?? 'pjm7908@hanmail.net').toLowerCase().trim()

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  /** 공개 GET API — IP별 남용 방지(불특정 다수), Supabase 세션 갱신 생략 */
  if (request.method === 'GET' && path === '/api/home/recommendations') {
    const rate = takeRateLimit(request, 'api:home:recommendations', { windowMs: 60_000, max: 120 })
    if (!rate.ok) {
      return NextResponse.json(
        { ok: false, error: '요청이 너무 많습니다.' },
        { status: 429, headers: { 'Retry-After': String(rate.retryAfterSec) } }
      )
    }
    return NextResponse.next()
  }

  if (request.method === 'GET' && path === '/api/programs/trending') {
    const rate = takeRateLimit(request, 'api:programs:trending', { windowMs: 60_000, max: 120 })
    if (!rate.ok) {
      return NextResponse.json(
        { ok: false, error: '요청이 너무 많습니다.' },
        { status: 429, headers: { 'Retry-After': String(rate.retryAfterSec) } }
      )
    }
    return NextResponse.next()
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
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

  const { data: { user } } = await supabase.auth.getUser()

  const isProtected = PROTECTED.some(p => path.startsWith(p))
  const isAdminPath = path.startsWith('/admin')
  /** 수동 동기화 API만 라우트 내 세션/시크릿 검증 (다른 /api/admin/* 는 미들웨어에서 관리자 이메일 강제) */
  const isAdminApiPath = path.startsWith('/api/admin') && path !== '/api/admin/sync'
  const isAdminArea = isAdminPath || isAdminApiPath

  if (isProtected && !user) {
    if (path.startsWith('/api/')) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', safeInternalNextPath(path))
    return NextResponse.redirect(url)
  }

  if (isAdminArea) {
    const email = user?.email?.toLowerCase().trim()
    const isAdmin = email === ADMIN_ONLY_EMAIL
    if (!isAdmin) {
      if (path.startsWith('/api/')) {
        return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 })
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
  ],
}
