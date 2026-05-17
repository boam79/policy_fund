import { safeInternalNextPath } from '@/lib/auth/safeNextPath'

function isLocalHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1'
}

function pickPublicOrigin(): string {
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '')
  const app = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '')

  if (typeof window !== 'undefined') {
    const { hostname, origin } = window.location
    if (isLocalHost(hostname)) return origin
    if (site && !/localhost|127\.0\.0\.1/i.test(site)) return site
    if (app && !/localhost|127\.0\.0\.1/i.test(app)) return app
    return origin
  }

  const base = site || app
  if (!base) {
    throw new Error(
      'OAuth redirect URL을 만들 수 없습니다. NEXT_PUBLIC_SITE_URL(또는 NEXT_PUBLIC_APP_URL)을 배포 도메인으로 설정하세요.'
    )
  }
  return base
}

/**
 * Supabase `signInWithOAuth`용 redirectTo.
 * Supabase 대시보드 > URL Configuration에 동일 origin의 `/auth/callback` 이 있어야 합니다.
 */
export function buildOAuthCallbackUrl(nextPath: string): string {
  const next = safeInternalNextPath(nextPath)
  const qs = new URLSearchParams({ next })
  return `${pickPublicOrigin()}/auth/callback?${qs.toString()}`
}
