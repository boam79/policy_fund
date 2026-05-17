/**
 * POST /api/search 공통 실행 — relaxed 시 0건이면 조건 단계 완화, strict 시 완화 없음
 */
import { collectSearchTextTerms, unifiedSearch, type SearchParams } from './unifiedSearch'

export type ProgramSearchMode = 'strict' | 'relaxed'

export function normalizeProgramSearchMode(raw: unknown): ProgramSearchMode {
  return raw === 'strict' ? 'strict' : 'relaxed'
}

export type RunProgramSearchResult = {
  result: Awaited<ReturnType<typeof unifiedSearch>>
  effectiveSearch: SearchParams
  fallbackApplied: string[]
}

export async function runProgramSearch(
  params: SearchParams,
  mode: ProgramSearchMode
): Promise<RunProgramSearchResult> {
  let effectiveSearch: SearchParams = { ...params }
  let result = await unifiedSearch(effectiveSearch)
  const fallbackApplied: string[] = []

  if (mode === 'strict') {
    return { result, effectiveSearch, fallbackApplied }
  }

  if (result.total === 0 && (effectiveSearch.keyword || effectiveSearch.support_purpose)) {
    effectiveSearch = {
      ...effectiveSearch,
      keyword: undefined,
      support_purpose: undefined,
    }
    result = await unifiedSearch(effectiveSearch)
    if (result.total > 0) fallbackApplied.push('drop_keyword')
  }

  if (result.total === 0 && effectiveSearch.city) {
    effectiveSearch = {
      ...effectiveSearch,
      city: undefined,
      keyword: undefined,
      support_purpose: undefined,
    }
    result = await unifiedSearch(effectiveSearch)
    if (result.total > 0) fallbackApplied.push('drop_city')
  }

  if (result.total === 0 && effectiveSearch.industry) {
    effectiveSearch = {
      ...effectiveSearch,
      city: undefined,
      industry: undefined,
      keyword: undefined,
      support_purpose: undefined,
    }
    result = await unifiedSearch(effectiveSearch)
    if (result.total > 0) fallbackApplied.push('drop_industry')
  }

  return { result, effectiveSearch, fallbackApplied }
}

export { collectSearchTextTerms }
