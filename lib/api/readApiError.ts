/** API 응답에서 사용자용 오류 메시지 추출 (레거시 `error` / 표준 `message`) */
export function readApiError(json: unknown, fallback = '요청 처리에 실패했습니다.'): string {
  if (!json || typeof json !== 'object') return fallback
  const o = json as Record<string, unknown>
  if (typeof o.message === 'string' && o.message.trim()) return o.message
  if (typeof o.error === 'string' && o.error.trim()) return o.error
  return fallback
}
