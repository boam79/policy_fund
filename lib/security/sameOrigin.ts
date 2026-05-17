import type { NextRequest } from 'next/server'

export type SameOriginOptions = {
  /**
   * CSRF 보호 구간: Origin·Referer가 모두 없으면 거부 (curl·서버 간 호출은 Cron Bearer 등 별도 경로 사용)
   */
  strict?: boolean
}

/**
 * 브라우저가 보낸 Origin/Referer가 현재 호스트와 일치하는지 확인.
 */
export function isSameOriginRequest(
  request: NextRequest,
  options: SameOriginOptions = {}
): boolean {
  const hostHeader =
    request.headers.get('x-forwarded-host')?.split(',')[0]?.trim() ??
    request.headers.get('host')?.split(',')[0]?.trim()
  if (!hostHeader) return !options.strict

  const expectedHost = hostHeader.toLowerCase()

  const origin = request.headers.get('origin')
  if (origin) {
    try {
      return new URL(origin).host.toLowerCase() === expectedHost
    } catch {
      return false
    }
  }

  const referer = request.headers.get('referer')
  if (referer) {
    try {
      return new URL(referer).host.toLowerCase() === expectedHost
    } catch {
      return false
    }
  }

  if (options.strict) return false

  return true
}
