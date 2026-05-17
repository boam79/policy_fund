import { rowsToCsv } from '@/lib/export/csvString'

function triggerDownload(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** 품질(PSST) 심사 결과 → 표 행 */
export function flattenQualityForExport(result: {
  summary?: { weightedScore?: number; grade?: string; submitVerdict?: string; submitPrediction?: string }
  axisDetails?: { name: string; score: number; maxScore: number; grade: string; findings: string[]; improvements: string[] }[]
  immediateFixes?: string[]
  recommendedImprovements?: string[]
  expectedQuestions?: { questions: string[] }
}): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = []
  const s = result.summary
  rows.push({ 구분: '요약', 항목: '종합점수', 내용: s?.weightedScore ?? '' })
  rows.push({ 구분: '요약', 항목: '등급', 내용: s?.grade ?? '' })
  rows.push({ 구분: '요약', 항목: '심사 판정', 내용: s?.submitVerdict ?? '' })
  rows.push({ 구분: '요약', 항목: '예측', 내용: s?.submitPrediction ?? '' })
  for (const ax of result.axisDetails ?? []) {
    rows.push({ 구분: '축별', 축명: ax.name, 점수: `${ax.score}/${ax.maxScore}`, 등급: ax.grade })
    for (const f of ax.findings ?? []) rows.push({ 구분: '발견', 축: ax.name, 내용: f })
    for (const im of ax.improvements ?? []) rows.push({ 구분: '개선', 축: ax.name, 내용: im })
  }
  for (const f of result.immediateFixes ?? []) rows.push({ 구분: '즉시수정', 내용: f })
  for (const r of result.recommendedImprovements ?? []) rows.push({ 구분: '권장개선', 내용: r })
  for (let i = 0; i < (result.expectedQuestions?.questions?.length ?? 0); i += 1) {
    rows.push({ 구분: '예상질문', 번호: i + 1, 내용: result.expectedQuestions!.questions[i] })
  }
  return rows
}

/** 루브릭(스타트업) 심사 결과 → 표 행 */
export function flattenStartupForExport(result: {
  summary?: { totalScore?: number; grade?: string; label?: string; prediction?: string; baseScore?: number; bonusScore?: number }
  axisResults?: {
    axis: string
    score: number
    maxScore: number
    grade: string
    details: { criterion: string; maxPts: number; earnedPts: number; feedback: string }[]
    strengths: string[]
    improvements: string[]
  }[]
  topPriorityImprovements?: string[]
  finalChecklist?: { item: string; required: boolean; done: boolean }[]
}): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = []
  const s = result.summary
  rows.push({ 구분: '요약', 항목: '총점', 내용: s?.totalScore ?? '' })
  rows.push({ 구분: '요약', 항목: '등급', 내용: s?.grade ?? '' })
  rows.push({ 구분: '요약', 항목: '라벨', 내용: s?.label ?? '' })
  rows.push({ 구분: '요약', 항목: '예측', 내용: s?.prediction ?? '' })
  rows.push({ 구분: '요약', 항목: '기본점수', 내용: s?.baseScore ?? '' })
  rows.push({ 구분: '요약', 항목: '가점', 내용: s?.bonusScore ?? '' })
  for (const ax of result.axisResults ?? []) {
    rows.push({ 구분: '축별', 축명: ax.axis, 점수: `${ax.score}/${ax.maxScore}`, 등급: ax.grade })
    for (const d of ax.details ?? []) {
      rows.push({ 구분: '세부', 축: ax.axis, 기준: d.criterion, 배점: `${d.earnedPts}/${d.maxPts}`, 피드백: d.feedback })
    }
    for (const t of ax.strengths ?? []) rows.push({ 구분: '강점', 축: ax.axis, 내용: t })
    for (const t of ax.improvements ?? []) rows.push({ 구분: '개선', 축: ax.axis, 내용: t })
  }
  for (const p of result.topPriorityImprovements ?? []) rows.push({ 구분: '우선개선', 내용: p })
  for (const c of result.finalChecklist ?? []) {
    rows.push({ 구분: '체크리스트', 항목: c.item, 필수: c.required ? 'Y' : 'N', 완료: c.done ? 'Y' : 'N' })
  }
  return rows
}

export async function downloadEvaluationRows(format: 'csv' | 'xlsx', rows: Record<string, unknown>[], baseName: string) {
  const date = new Date().toISOString().slice(0, 10)
  if (format === 'csv') {
    const csv = rowsToCsv(rows)
    triggerDownload(`${baseName}_${date}.csv`, new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }))
    return
  }
  const ExcelJS = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('심사결과')
  if (rows.length === 0) {
    worksheet.addRow(['(데이터 없음)'])
  } else {
    const keys = Object.keys(rows[0])
    worksheet.columns = keys.map((key) => ({ header: key, key, width: 18 }))
    for (const row of rows) {
      const record: Record<string, unknown> = {}
      for (const key of keys) record[key] = row[key] ?? ''
      worksheet.addRow(record)
    }
  }
  const buf = await workbook.xlsx.writeBuffer()
  triggerDownload(
    `${baseName}_${date}.xlsx`,
    new Blob([buf], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
  )
}
