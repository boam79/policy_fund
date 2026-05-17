import type { NextRequest } from 'next/server'

/** Edge·Node 공통 — node:crypto 미사용(미들웨어 호환) */
function timingSafeEqualString(received: string, expected: string): boolean {
  const a = new TextEncoder().encode(received)
  const b = new TextEncoder().encode(expected)
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

/** Vercel Cron·수동 트리거용 Bearer CRON_SECRET */
export function isCronBearerAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim()
  if (!cronSecret) return false
  const authHeader = request.headers.get('authorization')?.trim() ?? ''
  if (!authHeader.startsWith('Bearer ')) return false
  const token = authHeader.slice('Bearer '.length)
  return timingSafeEqualString(token, cronSecret)
}
