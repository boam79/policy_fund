/**
 * 로그인/OAuth 완료 후 이동 경로 — 오픈 리다이렉트 방지.
 * 동일 출처 상대 경로만 허용 (`//`, `://`, 백슬래시, 제어문자 차단).
 */
export function safeInternalNextPath(raw: string | null | undefined): string {
  if (raw == null) return '/'
  let s = raw.trim()
  if (s === '' || s === '/') return '/'
  try {
    s = decodeURIComponent(s.replace(/\+/g, '%20'))
  } catch {
    return '/'
  }
  if (s.length > 2048) return '/'
  if (!s.startsWith('/')) return '/'
  if (s.startsWith('//')) return '/'
  if (s.includes('://')) return '/'
  if (s.includes('\\')) return '/'
  if (/[\u0000-\u001f\u007f]/.test(s)) return '/'
  return s
}
