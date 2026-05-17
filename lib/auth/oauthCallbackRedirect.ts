import type { NextRequest } from 'next/server'
import { safeInternalNextPath } from '@/lib/auth/safeNextPath'

const OAUTH_QUERY_KEYS = ['code', 'error', 'error_description'] as const

/**
 * Supabase OAuth(PKCE)가 Site URL(/) 등으로 돌아올 때 `?code=`가 노출되지 않도록
 * `/auth/callback`으로 보냅니다.
 *
 * `error`만 있는 URL(예: /login?error=auth_callback_failed)은 리다이렉트하지 않습니다.
 */
export function buildOAuthCallbackRedirect(request: NextRequest): URL | null {
  if (request.method !== 'GET') return null

  const { pathname, searchParams } = request.nextUrl
  if (pathname.startsWith('/auth/callback')) return null

  const code = searchParams.get('code')
  if (!code) return null

  const url = request.nextUrl.clone()
  url.pathname = '/auth/callback'

  if (!url.searchParams.has('next') && pathname !== '/auth/callback') {
    const rest = new URLSearchParams(searchParams.toString())
    for (const key of OAUTH_QUERY_KEYS) rest.delete(key)
    const qs = rest.toString()
    const nextPath = pathname === '/' ? '/' : qs ? `${pathname}?${qs}` : pathname
    url.searchParams.set('next', safeInternalNextPath(nextPath))
  }

  return url
}
