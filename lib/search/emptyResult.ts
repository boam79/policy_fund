import type { IndustryMatchMode } from '@/lib/gov-support/tools/industryMatch'
import { collectSearchTextTerms } from '@/lib/gov-support/tools/runProgramSearch'

export interface SearchFilterSnapshot {
  region: string | null
  city: string | null
  industry: string | null
  industry_match?: IndustryMatchMode | null
  keyword: string | null
  support_purpose: string | null
  business_age_years?: number | null
  employee_count?: number | null
  text_terms?: string[]
  include_closed?: boolean
}

export type SearchEmptyKind =
  | 'strict_zero'
  | 'relaxed_zero'
  | 'relaxed_zero_after_fallback'
  | 'relaxed_zero_bare'

export interface SearchEmptyState {
  kind: SearchEmptyKind
  title: string
  description: string
  /** 조건 해석·입력을 점검하라는 안내 (해당할 때만) */
  checkConditionsHint?: string
  /** DB·시장 측면 안내 */
  dataHint?: string
  filtersRelaxed: boolean
}

function normStr(v: string | null | undefined): string | null {
  const s = v?.trim()
  return s ? s : null
}

function normNum(v: number | null | undefined): number | null {
  return v == null || Number.isNaN(v) ? null : v
}

export function searchFiltersDiffer(
  requested: SearchFilterSnapshot,
  applied: SearchFilterSnapshot
): boolean {
  return (
    normStr(requested.region) !== normStr(applied.region) ||
    normStr(requested.city) !== normStr(applied.city) ||
    normStr(requested.industry) !== normStr(applied.industry) ||
    normStr(requested.keyword) !== normStr(applied.keyword) ||
    normStr(requested.support_purpose) !== normStr(applied.support_purpose) ||
    normNum(requested.business_age_years) !== normNum(applied.business_age_years) ||
    normNum(requested.employee_count) !== normNum(applied.employee_count) ||
    (requested.industry_match ?? 'match') !== (applied.industry_match ?? 'match')
  )
}

export function hasMeaningfulSearchFilters(f: SearchFilterSnapshot): boolean {
  return !!(
    normStr(f.region) ||
    normStr(f.city) ||
    normStr(f.industry) ||
    normStr(f.keyword) ||
    normStr(f.support_purpose) ||
    normNum(f.business_age_years) != null ||
    normNum(f.employee_count) != null ||
    (f.text_terms?.length ?? 0) > 0
  )
}

export function buildSearchFilterSnapshot(input: {
  region?: string | null
  city?: string | null
  industry?: string | null
  industry_match?: IndustryMatchMode | null
  keyword?: string | null
  support_purpose?: string | null
  business_age_years?: number | null
  employee_count?: number | null
  include_closed?: boolean
}): SearchFilterSnapshot {
  const text_terms = collectSearchTextTerms({
    industry: input.industry ?? undefined,
    support_purpose: input.support_purpose ?? undefined,
    keyword: input.keyword ?? undefined,
  })
  return {
    region: normStr(input.region),
    city: normStr(input.city),
    industry: normStr(input.industry),
    industry_match: input.industry_match ?? null,
    keyword: normStr(input.keyword),
    support_purpose: normStr(input.support_purpose),
    business_age_years: normNum(input.business_age_years),
    employee_count: normNum(input.employee_count),
    text_terms,
    include_closed: input.include_closed,
  }
}

/** parse 결과에서 확신도 낮은 필드 키 목록 */
export function lowConfidenceFieldKeys(
  conditions: Record<string, { confidence?: number } | undefined> | undefined,
  threshold = 0.4
): string[] {
  if (!conditions) return []
  return Object.entries(conditions)
    .filter(([, v]) => v != null && (v.confidence ?? 1) < threshold)
    .map(([k]) => k)
}

export function buildSearchEmptyState(input: {
  search_mode: 'strict' | 'relaxed'
  fallback_applied: string[]
  requested_filters: SearchFilterSnapshot
  applied_filters: SearchFilterSnapshot
}): SearchEmptyState {
  const filtersRelaxed =
    input.fallback_applied.length > 0 ||
    searchFiltersDiffer(input.requested_filters, input.applied_filters)

  if (input.search_mode === 'strict') {
    return {
      kind: 'strict_zero',
      title: '입력한 조건을 모두 만족하는 공고가 없습니다',
      description:
        '지금 설정한 지역·업종·검색어를 그대로 적용했을 때 일치하는 공고가 없습니다. 조건이 넓으면 완화 검색을, 질문 해석이 맞는지는 진단에서 확인해 보세요.',
      checkConditionsHint:
        '홈·진단에서 추출된 지역·업종이 의도와 다르면 검색 전에 수정해 주세요.',
      dataHint: '해당 조건의 진행 중 공고가 적을 수도 있습니다.',
      filtersRelaxed: false,
    }
  }

  if (!hasMeaningfulSearchFilters(input.requested_filters)) {
    return {
      kind: 'relaxed_zero_bare',
      title: '검색 조건이 거의 없습니다',
      description:
        '지역, 업종, 키워드 중 하나 이상을 입력해야 공고를 찾을 수 있습니다. 자연어로 홈에서 검색하거나 필터를 선택해 주세요.',
      checkConditionsHint: '질문만 입력하고 조건이 비어 있으면 여기로 올 수 있습니다.',
      filtersRelaxed: false,
    }
  }

  if (filtersRelaxed) {
    return {
      kind: 'relaxed_zero_after_fallback',
      title: '조건을 완화해도 공고를 찾지 못했습니다',
      description:
        '입력·추출한 조건을 단계적으로 넓혀 검색했지만 일치하는 공고가 없습니다. 공고 데이터에 해당 조합이 없을 수 있습니다.',
      checkConditionsHint:
        'AI가 질문을 잘못 이해했을 수 있습니다. 진단 화면에서 지역·업종·업력을 확인·수정한 뒤 다시 검색해 보세요.',
      dataHint: '마감 공고 포함, 다른 지역·업종으로 시도해 보세요.',
      filtersRelaxed: true,
    }
  }

  return {
    kind: 'relaxed_zero',
    title: '입력한 조건과 일치하는 공고가 없습니다',
    description:
      '설정한 필터를 그대로 적용했을 때 결과가 없습니다. 조건을 넓히거나 키워드를 바꿔 보세요.',
    checkConditionsHint:
      '진단에서 추출 조건이 질문과 다르면 수정 후 다시 검색해 주세요.',
    dataHint: '최근 등록 공고 수·마감 여부에 따라 달라질 수 있습니다.',
    filtersRelaxed: false,
  }
}
