/** 사업자등록번호 10자리 숫자만 */
export function normalizeBusinessNumber(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  if (digits.length !== 10) return null
  return digits
}

/** 개업일 YYYYMMDD */
export function normalizeStartDate(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  if (digits.length !== 8) return null
  return digits
}
