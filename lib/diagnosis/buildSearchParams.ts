import type { ParseNLResult } from '@/lib/query/parseNaturalLanguage'
import { toCanonicalIndustry } from '@/lib/industry/canonical'
import { getDiagnosisConditionValue, normalizeRegionForFilter } from './coerce'

/** 진단 화면 조건 → `/search` 쿼리 문자열 */
export function buildSearchQueryFromDiagnosis(
  parsed: ParseNLResult,
  editValues: Record<string, string>
): string {
  const params = new URLSearchParams()

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
  if (normalizedRegion) params.set('region', normalizedRegion)
  if (city) params.set('city', String(city))
  if (industry) params.set('industry', toCanonicalIndustry(String(industry)))
  if (businessAge != null) {
    const ageMeta = parsed.conditions.business_age_years
    const isUnderOnly =
      ageMeta?.source_text?.includes('미만') && Number(businessAge) === 0
    if (!isUnderOnly) {
      params.set('business_age_years', String(businessAge))
    }
  }
  if (employeeCount != null) params.set('employee_count', String(employeeCount))
  if (annualRevenue != null) params.set('annual_revenue_krw', String(annualRevenue))
  if (creditScore != null) params.set('credit_score', String(creditScore))
  if (typeof taxArrears === 'boolean') params.set('tax_arrears', taxArrears ? 'yes' : 'no')
  if (supportPurpose) params.set('support_purpose', String(supportPurpose))

  const rawQuery = parsed.raw_query?.trim()
  if (rawQuery) params.set('q', rawQuery)

  return params.toString()
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
