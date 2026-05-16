/** CSV 문자열 유틸 (브라우저·서버 공통, xlsx 의존성 없음) */
function escapeCsvCell(v: unknown): string {
  const s = v == null ? '' : String(v).replace(/"/g, '""')
  return s.includes(',') || s.includes('\n') || s.includes('"') ? `"${s}"` : s
}

export function rowsToCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  return [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => escapeCsvCell(r[h])).join(',')),
  ].join('\n')
}
