import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { safeInternalNextPath } from '@/lib/auth/safeNextPath'

const OAUTH_QUERY_KEYS = ['code', 'error', 'error_description', 'next'] as const

/** OAuth 완료 후 이동할 URL (`code` 등 제거) */
export function getPostOAuthRedirectUrl(request: NextRequest): URL {
  const next = request.nextUrl.searchParams.get('next')
  if (next) {
    return new URL(safeInternalNextPath(next), request.url)
  }
  const url = request.nextUrl.clone()
  for (const key of OAUTH_QUERY_KEYS) url.searchParams.delete(key)
  return url
}

/**
 * PKCE `code`를 받은 요청에서 세션으로 교환 (Supabase Next.js 권장: 리다이렉트 전에 동일 요청에서 처리).
 * @returns 성공/실패 리다이렉트, code 없으면 null
 */
export async function exchangeOAuthCodeIfPresent(
  request: NextRequest
): Promise<NextResponse | null> {
  if (request.method !== 'GET') return null

  const raw = request.nextUrl.searchParams.get('code')
  if (!raw) return null
  const code = raw.replace(/#+$/, '').trim()

  const target = getPostOAuthRedirectUrl(request)
  let response = NextResponse.redirect(target)

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
          response = NextResponse.redirect(target)
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    console.error('[auth] exchangeCodeForSession:', error.message)
    const fail = new URL('/login', request.url)
    fail.searchParams.set('auth_error', 'auth_callback_failed')
    return NextResponse.redirect(fail)
  }

  return response
}
