import { formatKRW } from '@/types'
import type { ParseNLResult, ParsedConditions } from '@/lib/query/parseNaturalLanguage'
import { coerceValueByKey } from '@/lib/diagnosis/coerce'

export const CONDITION_LABELS: Record<string, string> = {
  region: '📍 지역',
  city: '🏙️ 시군구',
  industry: '🏭 업종',
  business_age_years: '📅 업력',
  employee_count: '👥 직원 수',
  annual_revenue_krw: '💰 연 매출',
  desired_amount_krw: '🎯 희망 지원금',
  support_purpose: '📋 지원 목적',
  business_type: '🏢 사업자 유형',
  startup_stage: '🚀 창업 단계',
  credit_score: '📊 신용점수',
  tax_arrears: '📂 세금 체납',
}

export const MISSING_LABELS: Record<string, string> = {
  region: '지역',
  city: '시군구',
  industry: '업종',
  business_age_years: '업력',
  employee_count: '직원 수',
  annual_revenue_krw: '연 매출',
  desired_amount_krw: '희망 지원금',
  support_purpose: '지원 목적',
  business_type: '사업자 유형',
  startup_stage: '창업 단계',
  credit_score: '신용점수',
  tax_arrears: '세금 체납',
}

export function formatConditionValue(key: string, value: unknown, sourceText?: string): string {
  if (key === 'annual_revenue_krw' || key === 'desired_amount_krw') {
    return formatKRW(Number(value))
  }
  if (key === 'business_age_years') {
    if (sourceText?.includes('미만')) return sourceText.trim()
    return `${value}년`
  }
  if (key === 'employee_count') return `${value}명`
  if (key === 'credit_score') return `${value}점`
  if (key === 'tax_arrears') return value ? '있음' : '없음'
  return String(value)
}

export function getConditionEntries(conditions: ParsedConditions) {
  return Object.entries(conditions).filter(([, v]) => v != null) as [
    string,
    { value: unknown; confidence: number; source_text?: string },
  ][]
}

export function conditionHasDisplayValue(
  parsed: ParseNLResult,
  editValues: Record<string, string>,
  key: string
): boolean {
  const rawEdit = editValues[key]
  if (rawEdit !== undefined && rawEdit.trim() !== '') return true
  const cond = parsed.conditions[key as keyof ParsedConditions]
  if (cond == null) return false
  const v = cond.value
  if (v === undefined || v === null) return false
  if (typeof v === 'string') return v.trim() !== ''
  if (typeof v === 'number' || typeof v === 'boolean') return true
  return true
}

export function buildEffectiveEntries(
  parsed: ParseNLResult,
  editValues: Record<string, string>
): [string, { value: unknown; confidence: number; source_text?: string }][] {
  const base = getConditionEntries(parsed.conditions)
  const keysInBase = new Set(base.map(([k]) => k))

  const extra: [string, { value: unknown; confidence: number; source_text?: string }][] = []
  for (const k of parsed.missing_important) {
    if (keysInBase.has(k)) continue
    const raw = (editValues[k] ?? '').trim()
    if (!raw) continue
    const coerced = coerceValueByKey(k, raw)
    extra.push([k, { value: coerced !== undefined ? coerced : raw, confidence: 0.35 }])
  }
  return [...base, ...extra]
}

export function missingNeedsYellowAddRow(parsed: ParseNLResult, key: string): boolean {
  const inExtracted = getConditionEntries(parsed.conditions).some(([k]) => k === key)
  return !inExtracted
}

export const NUMERIC_STEPPER_KEYS = new Set(['business_age_years', 'employee_count'])
