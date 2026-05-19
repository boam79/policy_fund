import type { ParsedConditions } from '@/lib/query/parseNaturalLanguage'

export function coerceValueByKey(key: string, raw: string): unknown {
  const value = raw.trim()
  if (value.length === 0) return undefined

  if (
    ['business_age_years', 'employee_count', 'annual_revenue_krw', 'desired_amount_krw', 'credit_score'].includes(
      key
    )
  ) {
    const n = Number(value.replace(/,/g, ''))
    return Number.isFinite(n) ? n : undefined
  }
  if (key === 'tax_arrears') {
    if (['있음', 'yes', 'true', '1'].includes(value.toLowerCase())) return true
    if (['없음', 'no', 'false', '0'].includes(value.toLowerCase())) return false
    return undefined
  }
  return value
}

export { normalizeRegionOrNull as normalizeRegionForFilter } from '@/lib/geo/regions'

export function getDiagnosisConditionValue(
  parsed: { conditions: ParsedConditions },
  editValues: Record<string, string>,
  key: keyof ParsedConditions
): unknown {
  const edited = editValues[key]
  if (typeof edited === 'string' && edited.trim()) {
    return coerceValueByKey(String(key), edited)
  }
  return parsed.conditions[key]?.value
}
