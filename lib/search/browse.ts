/** 모집 중 공고 목록 자동 조회 (`/search?browse=1`) */
export const SEARCH_BROWSE_QUERY = 'browse=1'
export const SEARCH_LIST_HREF = `/search?${SEARCH_BROWSE_QUERY}`

export function isSearchBrowseEntry(searchParams: { get(name: string): string | null }): boolean {
  return searchParams.get('browse') === '1'
}

/** `/search` 단독 진입·더보기 — 필터 없이 목록 자동 조회 */
export function hasDefaultBrowseIntent(searchParams: {
  get(name: string): string | null
  toString(): string
}): boolean {
  const qs = searchParams.toString()
  return qs === '' || isSearchBrowseEntry(searchParams)
}

export function hasSearchFilterParams(searchParams: {
  get(name: string): string | null
}): boolean {
  return !!(
    searchParams.get('region') ||
    searchParams.get('industry') ||
    searchParams.get('keyword') ||
    searchParams.get('q') ||
    searchParams.get('support_purpose') ||
    searchParams.get('business_age_years') ||
    searchParams.get('employee_count') ||
    searchParams.get('tax_arrears') ||
    searchParams.get('search_mode') ||
    searchParams.get('include_closed')
  )
}
