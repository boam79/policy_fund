/**
 * 기본 Content-Security-Policy (Next.js 가이드 기반, Context7 /vercel/next.js 참고).
 * 네이버페이 SDK·Supabase·JSON-LD 인라인 스크립트와 호환되도록 최소 예외만 둔다.
 */
export function buildContentSecurityPolicy(): string {
  const isDev = process.env.NODE_ENV === 'development'
  let supabaseConnect = ''
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  if (supabaseUrl) {
    try {
      const u = new URL(supabaseUrl)
      const origin = `${u.protocol}//${u.host}`
      supabaseConnect = ` ${origin} wss://${u.host}`
    } catch {
      /* ignore */
    }
  }

  const directives = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' https://nsp.pay.naver.com${isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src 'self' https://pay.paygate.naver.com https://dev-pay.paygate.naver.com https://nsp.pay.naver.com${supabaseConnect}`,
    "frame-src 'self' https:",
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ]
  if (!isDev) {
    directives.push('upgrade-insecure-requests')
  }
  return directives.join('; ')
}
