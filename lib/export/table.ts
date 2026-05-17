import ExcelJS from 'exceljs'
import { rowsToCsv } from '@/lib/export/csvString'

export { rowsToCsv } from '@/lib/export/csvString'

/** 객체 배열을 XLSX 바이너리(Buffer)로 변환 (서버 전용, exceljs) */
export async function rowsToXlsxBuffer(
  rows: Record<string, unknown>[],
  sheetName = 'Sheet1'
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet(sheetName.slice(0, 31))

  if (rows.length === 0) {
    worksheet.addRow(['(데이터 없음)'])
  } else {
    const keys = Object.keys(rows[0])
    worksheet.columns = keys.map((key) => ({ header: key, key, width: 16 }))
    for (const row of rows) {
      const record: Record<string, unknown> = {}
      for (const key of keys) {
        record[key] = row[key] ?? ''
      }
      worksheet.addRow(record)
    }
  }

  const buf = await workbook.xlsx.writeBuffer()
  return Buffer.from(buf)
}
