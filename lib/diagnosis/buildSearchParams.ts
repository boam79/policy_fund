import type { ParseNLResult } from '@/lib/query/parseNaturalLanguage'
import { toCanonicalIndustry } from '@/lib/industry/canonical'
import { getDiagnosisConditionValue, normalizeRegionForFilter } from './coerce'
import { buildSearchQueryString } from '@/lib/search/queryParams'

/** 진단 화면 조건 → `/search` 쿼리 문자열 */
export function buildSearchQueryFromDiagnosis(
  parsed: ParseNLResult,
  editValues: Record<string, string>
): string {
  const region = getDiagnosisConditionValue(parsed, editValues, 'region')
  const city = getDiagnosisConditionValue(parsed, editValues, 'city')
  const industry = getDiagnosisConditionValue(parsed, editValues, 'industry')
  const businessAge = getDiagnosisConditionValue(parsed, editValues, 'business_age_years')
  const employeeCount = getDiagnosisConditionValue(parsed, editValues, 'employee_count')
  const annualRevenue = getDiagnosisConditionValue(parsed, editValues, 'annual_revenue_krw')
  const creditScore = getDiagnosisConditionValue(parsed, editValues, 'credit_score')
  const taxArrears = getDiagnosisConditionValue(parsed, editValues, 'tax_arrears')
  const supportPurpose = getDiagnosisConditionValue(parsed, editValues, 'support_purpose')

  const normalizedRegion = normalizeRegionForFilter(region)
  let businessAgeStr = ''
  if (businessAge != null) {
    const ageMeta = parsed.conditions.business_age_years
    const isUnderOnly =
      ageMeta?.source_text?.includes('미만') && Number(businessAge) === 0
    if (!isUnderOnly) {
      businessAgeStr = String(businessAge)
    }
  }

  return buildSearchQueryString({
    region: normalizedRegion ?? undefined,
    city: city ? String(city) : undefined,
    industry: industry ? toCanonicalIndustry(String(industry)) : undefined,
    businessAge: businessAgeStr || undefined,
    employeeCount: employeeCount != null ? String(employeeCount) : undefined,
    annualRevenue: annualRevenue != null ? String(annualRevenue) : undefined,
    creditScore: creditScore != null ? String(creditScore) : undefined,
    taxArrears: typeof taxArrears === 'boolean' ? (taxArrears ? 'yes' : 'no') : undefined,
    supportPurpose: supportPurpose ? String(supportPurpose) : undefined,
    q: parsed.raw_query?.trim() || undefined,
  })
}

export function saveProfileDraftFromDiagnosis(
  parsed: ParseNLResult,
  editValues: Record<string, string>
): void {
  if (typeof window === 'undefined') return
  const region = normalizeRegionForFilter(getDiagnosisConditionValue(parsed, editValues, 'region'))
  const city = getDiagnosisConditionValue(parsed, editValues, 'city')
  const industry = getDiagnosisConditionValue(parsed, editValues, 'industry')
  const businessAge = getDiagnosisConditionValue(parsed, editValues, 'business_age_years')
  const employeeCount = getDiagnosisConditionValue(parsed, editValues, 'employee_count')
  const taxArrears = getDiagnosisConditionValue(parsed, editValues, 'tax_arrears')
  const supportPurpose = getDiagnosisConditionValue(parsed, editValues, 'support_purpose')

  const profileDraft = {
    region: region ?? undefined,
    city: city ? String(city) : undefined,
    industry: industry ? toCanonicalIndustry(String(industry)) : undefined,
    business_age_years: businessAge != null ? Number(businessAge) : undefined,
    employee_count: employeeCount != null ? Number(employeeCount) : undefined,
    tax_arrears: typeof taxArrears === 'boolean' ? taxArrears : undefined,
    support_purpose: supportPurpose ? String(supportPurpose) : undefined,
  }
  localStorage.setItem('pf:last_profile_draft', JSON.stringify(profileDraft))
}
