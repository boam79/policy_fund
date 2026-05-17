import type { NextRequest } from 'next/server'

/**
 * 브라우저가 보낸 Origin/Referer가 현재 호스트와 일치하는지 확인.
 * Origin·Referer 모두 없으면 true (서버 검증 스크립트·Cron 등).
 */
export function isSameOriginRequest(request: NextRequest): boolean {
  const hostHeader =
    request.headers.get('x-forwarded-host')?.split(',')[0]?.trim() ??
    request.headers.get('host')?.split(',')[0]?.trim()
  if (!hostHeader) return true

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

  return true
}
