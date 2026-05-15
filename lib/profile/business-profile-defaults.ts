import type { ParseNLResult, ParsedConditions, ExtractedCondition } from '@/lib/query/parseNaturalLanguage'

/** 마이페이지 `business_profiles`에서 쓰는 기본값 입력 스키마 */
export type SavedBusinessProfileDefaults = {
  region?: string | null
  city?: string | null
  industry?: string | null
  business_age_years?: number | null
  employee_count?: number | null
  annual_revenue_krw?: number | null
  desired_amount_krw?: number | null
  support_purpose?: string | null
  business_type?: string | null
  startup_stage?: string | null
  tax_arrears?: boolean | null
  company_name?: string | null
}

const PROFILE_CONF = 0.88
const PROFILE_SOURCE = '마이페이지 기업 기초정보'

function fromProfile<T>(value: T): ExtractedCondition<T> {
  return { value, confidence: PROFILE_CONF, source_text: PROFILE_SOURCE }
}

function hasMeaningfulProfile(p: SavedBusinessProfileDefaults): boolean {
  return Boolean(
    p.region?.trim() ||
      p.city?.trim() ||
      p.industry?.trim() ||
      p.support_purpose?.trim() ||
      p.startup_stage?.trim() ||
      p.business_type?.trim() ||
      p.company_name?.trim() ||
      p.business_age_years != null ||
      p.employee_count != null ||
      p.annual_revenue_krw != null ||
      p.desired_amount_krw != null ||
      p.tax_arrears != null
  )
}

/** 홈 검색창 등에 넣을 자연어 한 줄 (데이터가 없으면 null) */
export function buildDefaultSearchQueryFromProfile(p: SavedBusinessProfileDefaults): string | null {
  if (!hasMeaningfulProfile(p)) return null
  const parts: string[] = []
  if (p.region?.trim()) parts.push(p.region.trim())
  if (p.city?.trim()) parts.push(`${p.city.trim()}`)
  if (p.industry?.trim()) parts.push(p.industry.trim())
  if (p.business_age_years != null && Number.isFinite(p.business_age_years)) {
    parts.push(`업력 ${p.business_age_years}년`)
  }
  if (p.employee_count != null && Number.isFinite(p.employee_count)) {
    parts.push(`직원 ${p.employee_count}명`)
  }
  if (p.annual_revenue_krw != null && p.annual_revenue_krw > 0) {
    parts.push(`연매출 약 ${p.annual_revenue_krw.toLocaleString('ko-KR')}원`)
  }
  if (p.startup_stage?.trim()) parts.push(p.startup_stage.trim())
  if (p.business_type?.trim()) {
    parts.push(p.business_type === '개인' ? '개인사업자' : p.business_type.trim())
  }
  if (p.tax_arrears === true) parts.push('세금 체납 있음')
  else if (p.tax_arrears === false) parts.push('세금 체납 없음')
  if (p.desired_amount_krw != null && p.desired_amount_krw > 0) {
    parts.push(`희망 지원금 약 ${p.desired_amount_krw.toLocaleString('ko-KR')}원`)
  }
  if (p.support_purpose?.trim()) parts.push(p.support_purpose.trim())
  if (parts.length === 0) return null
  return `${parts.join(', ')} 조건에 맞는 지원사업을 찾아줘`
}

/** 진단 화면: LLM 추출 결과에 마이페이지 저장값을 보강(누락·저신뢰만) */
export function mergeSavedProfileIntoParsed(
  parsed: ParseNLResult,
  profile: SavedBusinessProfileDefaults
): ParseNLResult {
  if (!hasMeaningfulProfile(profile)) return parsed

  const next: ParsedConditions = { ...parsed.conditions }
  const filled = new Set<string>()

  const tryFill = (key: keyof ParsedConditions, raw: unknown) => {
    if (raw === null || raw === undefined) return
    if (typeof raw === 'string' && raw.trim() === '') return
    if (key === 'tax_arrears' && typeof raw !== 'boolean') return

    const existing = next[key] as ExtractedCondition<unknown> | undefined
    if (!existing) {
      ;(next as Record<string, ExtractedCondition<unknown>>)[key] = fromProfile(raw)
      filled.add(key)
      return
    }
    if (existing.confidence < 0.45) {
      ;(next as Record<string, ExtractedCondition<unknown>>)[key] = fromProfile(raw)
      filled.add(key)
    }
  }

  tryFill('region', profile.region?.trim() || null)
  tryFill('city', profile.city?.trim() || null)
  tryFill('industry', profile.industry?.trim() || null)
  tryFill('business_age_years', profile.business_age_years)
  tryFill('employee_count', profile.employee_count)
  tryFill('annual_revenue_krw', profile.annual_revenue_krw)
  tryFill('desired_amount_krw', profile.desired_amount_krw)
  tryFill('support_purpose', profile.support_purpose?.trim() || null)
  tryFill('business_type', profile.business_type?.trim() || null)
  tryFill('startup_stage', profile.startup_stage?.trim() || null)
  if (profile.tax_arrears !== null && profile.tax_arrears !== undefined) {
    tryFill('tax_arrears', profile.tax_arrears)
  }

  if (filled.size === 0) return parsed

  const missingImportant = parsed.missing_important.filter((k) => !filled.has(k))

  return {
    ...parsed,
    conditions: next,
    missing_important: missingImportant,
  }
}
