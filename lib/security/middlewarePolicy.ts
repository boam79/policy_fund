import type { NextRequest } from 'next/server'
import { isCronBearerAuthorized } from '@/lib/security/cronAuth'
import { takeRateLimit } from '@/lib/security/rateLimit'
import { isSameOriginRequest } from '@/lib/security/sameOrigin'

export type MiddlewareRateLimitConfig = { windowMs: number; max: number }

/** POST 공개·비용 API — Edge에서 1차 레이트리밋(라우트 내부 한도와 이중 방어) */
export const EDGE_RATE_LIMITS: Record<string, MiddlewareRateLimitConfig> = {
  '/api/query/parse': { windowMs: 60_000, max: 22 },
  '/api/search': { windowMs: 60_000, max: 42 },
  '/api/eligibility': { windowMs: 60_000, max: 32 },
  '/api/diagnosis/session': { windowMs: 60_000, max: 38 },
  '/api/contact': { windowMs: 60_000, max: 6 },
  '/api/feedback': { windowMs: 60_000, max: 28 },
  '/api/export/user': { windowMs: 60_000, max: 15 },
}

/** 세션·결제·문서 등 — 미들웨어에서 로그인 강제 */
export const API_LOGIN_PREFIXES = [
  '/api/billing/subscription',
  '/api/billing/cancel',
  '/api/billing/confirm',
  '/api/documents/',
  '/api/evaluate/',
  '/api/export/user',
] as const

/** Origin 검증(크로스 사이트 변경 요청 차단). 웹훅·Cron Bearer 제외 */
export const CSRF_PROTECTED_PREFIXES = [
  '/api/billing/',
  '/api/export/',
  '/api/documents/',
  '/api/evaluate/',
  '/api/admin/',
] as const

const WEBHOOK_EXEMPT = ['/api/billing/webhook']
const CRON_BEARER_EXEMPT = ['/api/admin/sync']

export function applyEdgeRateLimit(
  request: NextRequest,
  path: string
): Response | null {
  if (request.method !== 'POST') return null
  const cfg = EDGE_RATE_LIMITS[path]
  if (!cfg) return null
  const rate = takeRateLimit(request, `edge:${path}`, cfg)
  if (rate.ok) return null
  return Response.json(
    { ok: false, error_code: 'RATE_LIMITED', error: '요청이 너무 많습니다.' },
    { status: 429, headers: { 'Retry-After': String(rate.retryAfterSec) } }
  )
}

export function requiresApiLogin(path: string): boolean {
  return API_LOGIN_PREFIXES.some((p) => path === p || path.startsWith(p))
}

export function requiresCsrfCheck(path: string, method: string): boolean {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return false
  if (WEBHOOK_EXEMPT.some((p) => path === p || path.startsWith(p))) return false
  return CSRF_PROTECTED_PREFIXES.some((p) => path.startsWith(p))
}

export function csrfBlocked(request: NextRequest, path: string, method: string): boolean {
  if (!requiresCsrfCheck(path, method)) return false
  if (CRON_BEARER_EXEMPT.some((p) => path === p || path.startsWith(p)) && isCronBearerAuthorized(request)) {
    return false
  }
  return !isSameOriginRequest(request)
}
