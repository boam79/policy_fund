/** PostgREST ilike/or 필터용 — 와일드카드·구문 분리 문자 완화 */
export function sanitizeIlikeTerm(input: string, maxLen = 80): string {
  return input
    .replace(/\\/g, '')
    .replace(/%/g, '')
    .replace(/_/g, '')
    .replace(/,/g, '')
    .replace(/\(/g, '')
    .replace(/\)/g, '')
    .trim()
    .slice(0, maxLen)
}
