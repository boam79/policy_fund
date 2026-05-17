import type { NextRequest } from 'next/server'

/** @deprecated middleware에서 exchangeOAuthCodeIfPresent 사용. 테스트 호환용. */
export function buildOAuthCallbackRedirect(request: NextRequest): URL | null {
  if (request.method !== 'GET') return null
  if (request.nextUrl.pathname.startsWith('/auth/callback')) return null
  if (!request.nextUrl.searchParams.get('code')) return null
  return null
}
