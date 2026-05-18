import { createHmac, timingSafeEqual } from 'crypto'

function signingSecret(): string | null {
  const secret =
    process.env.DIAGNOSIS_SESSION_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    ''
  return secret || null
}

/** 진단 세션 GET용 HMAC (sid + 만료 시각) */
export function issueDiagnosisSessionToken(sessionId: string, expiresAtIso: string): string | null {
  const secret = signingSecret()
  if (!secret) return null
  return createHmac('sha256', secret)
    .update(`${sessionId}.${expiresAtIso}`)
    .digest('base64url')
}

export function buildDiagnosisSessionHref(sid: string, token: string, q?: string): string {
  const params = new URLSearchParams({ sid, token })
  if (q?.trim()) params.set('q', q.trim())
  return `/diagnosis?${params.toString()}`
}

export function verifyDiagnosisSessionToken(
  sessionId: string,
  expiresAtIso: string,
  token: string
): boolean {
  const expected = issueDiagnosisSessionToken(sessionId, expiresAtIso)
  if (!expected || !token) return false
  try {
    const a = Buffer.from(token)
    const b = Buffer.from(expected)
    return a.length === b.length && timingSafeEqual(a, b)
  } catch {
    return false
  }
}
