import type { ProgramSearchMode } from '@/lib/gov-support/tools/runProgramSearch'
import {
  normalizeIndustryMatchMode,
  type IndustryMatchMode,
} from '@/lib/gov-support/tools/industryMatch'
import { toCanonicalIndustry } from '@/lib/industry/canonical'
import { normalizeRegionForFilter } from '@/lib/geo/regions'
import type { SavedBusinessProfileDefaults } from '@/lib/profile/business-profile-defaults'

export type SearchQueryInput = {
  region?: string
  city?: string
  industry?: string
  keyword?: string
  supportPurpose?: string
  businessAge?: string
  employeeCount?: string
  annualRevenue?: string
  creditScore?: string
  taxArrears?: string
  searchMode?: ProgramSearchMode
  industryMatch?: IndustryMatchMode
  includeClosed?: boolean
  /** 진단·자연어 원문 */
  q?: string
}

export type ParsedSearchParams = {
  region: string
  city: string
  industry: string
  keyword: string
  supportPurpose: string
  businessAge: string
  employeeCount: string
  annualRevenue: string
  creditScore: string
  taxArrears: 'yes' | 'no' | ''
  searchMode: ProgramSearchMode
  industryMatch: IndustryMatchMode
  includeClosed: boolean
  rawQuery: string
}

export function buildSearchQueryString(input: SearchQueryInput): string {
  const params = new URLSearchParams()
  if (input.region) params.set('region', input.region)
  if (input.city) params.set('city', input.city)
  if (input.industry) params.set('industry', input.industry)
  if (input.industryMatch && input.industryMatch !== 'match') {
    params.set('industry_match', input.industryMatch)
  }
  if (input.supportPurpose) params.set('support_purpose', input.supportPurpose)
  if (input.keyword?.trim()) params.set('keyword', input.keyword.trim())
  if (input.businessAge) params.set('business_age_years', input.businessAge)
  if (input.employeeCount) params.set('employee_count', input.employeeCount)
  if (input.annualRevenue) params.set('annual_revenue_krw', input.annualRevenue)
  if (input.creditScore) params.set('credit_score', input.creditScore)
  if (input.taxArrears) params.set('tax_arrears', input.taxArrears)
  if (input.searchMode === 'strict') params.set('search_mode', 'strict')
  if (input.includeClosed) params.set('include_closed', '1')
  if (input.q?.trim()) params.set('q', input.q.trim())
  return params.toString()
}

export function buildSearchHref(input: SearchQueryInput): string {
  const qs = buildSearchQueryString(input)
  return qs ? `/search?${qs}` : '/search'
}

export function buildKeywordSearchHref(keyword: string): string {
  const k = keyword.trim()
  if (!k) return '/search'
  return buildSearchHref({ keyword: k, q: k })
}

export function parseSearchParams(sp: URLSearchParams): ParsedSearchParams {
  const taxRaw = sp.get('tax_arrears')
  return {
    region: normalizeRegionForFilter(sp.get('region')),
    city: sp.get('city') ?? '',
    industry: toCanonicalIndustry(sp.get('industry') ?? ''),
    keyword: sp.get('keyword') ?? sp.get('q') ?? '',
    supportPurpose: sp.get('support_purpose') ?? '',
    businessAge: sp.get('business_age_years') ?? '',
    employeeCount: sp.get('employee_count') ?? '',
    annualRevenue: sp.get('annual_revenue_krw') ?? '',
    creditScore: sp.get('credit_score') ?? '',
    taxArrears: taxRaw === 'yes' || taxRaw === 'no' ? taxRaw : '',
    searchMode: sp.get('search_mode') === 'strict' ? 'strict' : 'relaxed',
    industryMatch: normalizeIndustryMatchMode(sp.get('industry_match')),
    includeClosed: sp.get('include_closed') === '1',
    rawQuery: (sp.get('q') || sp.get('keyword') || '').trim(),
  }
}

/** 마이페이지 프로필 → `/search?…` 쿼리 문자열 (leading `?` 없음) */
export function buildSearchQueryFromProfile(p: SavedBusinessProfileDefaults): string | null {
  const params = new URLSearchParams()
  if (p.region?.trim()) params.set('region', p.region.trim())
  if (p.city?.trim()) params.set('city', p.city.trim())
  if (p.industry?.trim()) params.set('industry', toCanonicalIndustry(p.industry.trim()))
  if (p.business_age_years != null && Number.isFinite(p.business_age_years)) {
    params.set('business_age_years', String(p.business_age_years))
  }
  if (p.employee_count != null && Number.isFinite(p.employee_count)) {
    params.set('employee_count', String(p.employee_count))
  }
  if (p.support_purpose?.trim()) params.set('support_purpose', p.support_purpose.trim())
  if (p.tax_arrears === true) params.set('tax_arrears', 'yes')
  else if (p.tax_arrears === false) params.set('tax_arrears', 'no')
  const qs = params.toString()
  return qs || null
}

export function buildSearchUrlFromProfileQuery(p: SavedBusinessProfileDefaults): string | null {
  const qs = buildSearchQueryFromProfile(p)
  return qs ? `/search?${qs}` : null
}
