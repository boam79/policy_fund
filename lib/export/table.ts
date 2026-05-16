import * as XLSX from 'xlsx'
import { rowsToCsv } from '@/lib/export/csvString'

export { rowsToCsv } from '@/lib/export/csvString'

/** 객체 배열을 XLSX 바이너리(Buffer)로 변환 (서버 전용) */
export function rowsToXlsxBuffer(rows: Record<string, unknown>[], sheetName = 'Sheet1'): Buffer {
  const wsData =
    rows.length > 0
      ? [Object.keys(rows[0]), ...rows.map((r) => Object.keys(rows[0]).map((k) => r[k] ?? ''))]
      : [['(데이터 없음)']]
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(wsData)
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31))
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}
