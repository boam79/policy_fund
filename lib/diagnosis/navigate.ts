import type { ParseNLResult } from '@/lib/query/parseNaturalLanguage'
import { buildSearchQueryFromDiagnosis, saveProfileDraftFromDiagnosis } from './buildSearchParams'

export function buildDiagnosisQuickReportHref(
  parsed: ParseNLResult,
  opts: { sid?: string | null; encodedData?: string | null }
): string {
  const q = encodeURIComponent(parsed.raw_query ?? '')
  if (opts.sid) {
    return `/report/quick?sid=${encodeURIComponent(opts.sid)}&q=${q}`
  }
  const data = opts.encodedData ?? encodeURIComponent(JSON.stringify(parsed))
  return `/report/quick?q=${q}&data=${data}`
}

export function applyDiagnosisSearchNavigation(
  router: { push: (url: string) => void },
  parsed: ParseNLResult,
  editValues: Record<string, string>
) {
  saveProfileDraftFromDiagnosis(parsed, editValues)
  const qs = buildSearchQueryFromDiagnosis(parsed, editValues)
  router.push(qs ? `/search?${qs}` : '/search')
}
