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

const REGION_NORMALIZE_MAP: Record<string, string> = {
  서울특별시: '서울',
  경기도: '경기',
  인천광역시: '인천',
  부산광역시: '부산',
  대구광역시: '대구',
  광주광역시: '광주',
  대전광역시: '대전',
  울산광역시: '울산',
  세종특별자치시: '세종',
  강원도: '강원',
  강원특별자치도: '강원',
  충청북도: '충북',
  충청남도: '충남',
  전라북도: '전북',
  전북특별자치도: '전북',
  전라남도: '전남',
  경상북도: '경북',
  경상남도: '경남',
  제주도: '제주',
  제주특별자치도: '제주',
}

export function normalizeRegionForFilter(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const raw = value.trim()
  if (!raw) return null
  return REGION_NORMALIZE_MAP[raw] ?? raw
}

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
