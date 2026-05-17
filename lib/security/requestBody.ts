import type { NextRequest } from 'next/server'

export function isBodyTooLarge(request: NextRequest, maxBytes: number): boolean {
  const raw = request.headers.get('content-length')
  if (!raw) return false
  const n = parseInt(raw, 10)
  return Number.isFinite(n) && n > maxBytes
}

/** JSON 본문 크기 상한(문자 수). 초과 시 null */
export async function readJsonBody<T = unknown>(
  request: NextRequest,
  maxBytes: number
): Promise<{ ok: true; data: T } | { ok: false; reason: 'too_large' | 'invalid_json' }> {
  if (isBodyTooLarge(request, maxBytes)) {
    return { ok: false, reason: 'too_large' }
  }
  try {
    const text = await request.text()
    if (text.length > maxBytes) {
      return { ok: false, reason: 'too_large' }
    }
    if (!text.trim()) {
      return { ok: true, data: {} as T }
    }
    return { ok: true, data: JSON.parse(text) as T }
  } catch {
    return { ok: false, reason: 'invalid_json' }
  }
}
