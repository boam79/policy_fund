/** 홈 「더보기」→ 검색 목록 자동 조회용 쿼리 (`/search?browse=1`) */
export const SEARCH_BROWSE_QUERY = 'browse=1'

export function isSearchBrowseEntry(searchParams: { get(name: string): string | null }): boolean {
  return searchParams.get('browse') === '1'
}
