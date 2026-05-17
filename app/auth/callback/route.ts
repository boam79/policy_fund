import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getPostOAuthRedirectUrl } from '@/lib/auth/oauthCodeExchange'

function redirectTarget(request: NextRequest, destination: URL): URL {
  const forwardedHost = request.headers.get('x-forwarded-host')
  const isLocal = process.env.NODE_ENV === 'development'
  if (!isLocal && forwardedHost) {
    return new URL(`${destination.pathname}${destination.search}`, `https://${forwardedHost}`)
  }
  return destination
}

/**
 * OAuth·이메일 인증 콜백 (폴백 — 일반적으로 middleware에서 code 교환 완료).
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const oauthError = request.nextUrl.searchParams.get('error')
  const destination = getPostOAuthRedirectUrl(request)

  if (oauthError && !code) {
    const fail = new URL('/login', request.url)
    fail.searchParams.set('auth_error', 'oauth_denied')
    return NextResponse.redirect(redirectTarget(request, fail))
  }

  if (!code) {
    return NextResponse.redirect(redirectTarget(request, destination))
  }

  let response = NextResponse.redirect(redirectTarget(request, destination))

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
          response = NextResponse.redirect(redirectTarget(request, destination))
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (!error) return response

  console.error('[auth/callback] exchangeCodeForSession failed:', error.message)
  const fail = new URL('/login', request.url)
  fail.searchParams.set('auth_error', 'auth_callback_failed')
  return NextResponse.redirect(redirectTarget(request, fail))
}
