import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { safeInternalNextPath } from '@/lib/auth/safeNextPath'

/** OAuth PKCE 완료 후 리다이렉트 URL (Vercel x-forwarded-host 대응) */
function redirectTarget(request: NextRequest, path: string): URL {
  const { origin } = request.nextUrl
  const forwardedHost = request.headers.get('x-forwarded-host')
  const isLocal = process.env.NODE_ENV === 'development'
  if (!isLocal && forwardedHost) {
    return new URL(path, `https://${forwardedHost}`)
  }
  return new URL(path, origin)
}

/**
 * Google·카카오 OAuth 콜백.
 * Route Handler에서는 setAll 시 반환할 NextResponse에 쿠키를 실어야 브라우저에 세션이 저장됩니다.
 * @see https://supabase.com/docs/guides/auth/server-side/nextjs
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const oauthError = request.nextUrl.searchParams.get('error')
  const next = safeInternalNextPath(request.nextUrl.searchParams.get('next'))

  if (oauthError && !code) {
    const fail = redirectTarget(request, '/login')
    fail.searchParams.set('auth_error', 'oauth_denied')
    return NextResponse.redirect(fail)
  }

  let response = NextResponse.redirect(redirectTarget(request, next))

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
          response = NextResponse.redirect(redirectTarget(request, next))
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return response
    }
    console.error('[auth/callback] exchangeCodeForSession failed:', error.message)
  }

  const fail = redirectTarget(request, '/login')
  fail.searchParams.set('auth_error', 'auth_callback_failed')
  return NextResponse.redirect(fail)
}
