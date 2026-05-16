import type { NextRequest } from 'next/server'

type Bucket = {
  count: number
  resetAt: number
}

type RateLimitOptions = {
  windowMs: number
  max: number
}

type RateLimitResult = {
  ok: boolean
  limit: number
  remaining: number
  resetAt: number
  retryAfterSec: number
}

const GLOBAL_KEY = '__pf_rate_limit_store__'

function getStore(): Map<string, Bucket> {
  const g = globalThis as typeof globalThis & {
    [GLOBAL_KEY]?: Map<string, Bucket>
  }
  if (!g[GLOBAL_KEY]) g[GLOBAL_KEY] = new Map<string, Bucket>()
  return g[GLOBAL_KEY]!
}

export function getClientIp(request: NextRequest): string {
  /** Vercel 등 신뢰 프록시 뒤에서만 의미 있음; 클라이언트 직결 시 XFF 스푸핑 가능 */
  const xff = request.headers.get('x-forwarded-for')
  if (xff) {
    const first = xff.split(',')[0]?.trim()
    if (first) return first
  }
  const xrip = request.headers.get('x-real-ip')?.trim()
  if (xrip) return xrip
  return 'unknown'
}

export function takeRateLimit(
  request: NextRequest,
  namespace: string,
  options: RateLimitOptions
): RateLimitResult {
  const now = Date.now()
  const store = getStore()
  const key = `${namespace}:${getClientIp(request)}`
  const current = store.get(key)

  if (!current || current.resetAt <= now) {
    const resetAt = now + options.windowMs
    store.set(key, { count: 1, resetAt })
    return {
      ok: true,
      limit: options.max,
      remaining: Math.max(0, options.max - 1),
      resetAt,
      retryAfterSec: 0,
    }
  }

  if (current.count >= options.max) {
    const retryAfterSec = Math.max(1, Math.ceil((current.resetAt - now) / 1000))
    return {
      ok: false,
      limit: options.max,
      remaining: 0,
      resetAt: current.resetAt,
      retryAfterSec,
    }
  }

  current.count += 1
  store.set(key, current)
  return {
    ok: true,
    limit: options.max,
    remaining: Math.max(0, options.max - current.count),
    resetAt: current.resetAt,
    retryAfterSec: 0,
  }
}
