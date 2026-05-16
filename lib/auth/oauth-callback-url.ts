import { safeInternalNextPath } from '@/lib/auth/safeNextPath'

/**
 * Supabase `signInWithOAuth`용 redirectTo.
 * Supabase 대시보드 > Authentication > URL Configuration에 동일한 URL(와일드카드)을 등록해야 합니다.
 * 예: https://your-domain.com/auth/callback
 */
export function buildOAuthCallbackUrl(nextPath: string): string {
  const origin =
    typeof window !== 'undefined'
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '')
  if (!origin) {
    throw new Error(
      'OAuth redirect URL을 만들 수 없습니다. NEXT_PUBLIC_APP_URL(또는 NEXT_PUBLIC_SITE_URL)을 배포 도메인으로 설정하세요.'
    )
  }
  const next = safeInternalNextPath(nextPath)
  const qs = new URLSearchParams({ next })
  return `${origin}/auth/callback?${qs.toString()}`
}
