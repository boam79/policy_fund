import { stripHtmlToText } from '@/lib/utils/stripHtml'

export function normalizeProgramTitleKey(title: string): string {
  return stripHtmlToText(title)
    .replace(/\s+/g, '')
    .replace(/[^\p{L}\p{N}]/gu, '')
    .slice(0, 48)
    .toLowerCase()
}

/** 같은 페이지 결과 내 다른 출처 중복 여부 */
export function buildDuplicateHintMap(
  programs: { id: string; title: string; source: string }[]
): Map<string, boolean> {
  const sourcesByKey = new Map<string, Set<string>>()
  for (const p of programs) {
    const key = normalizeProgramTitleKey(p.title)
    if (!key) continue
    if (!sourcesByKey.has(key)) sourcesByKey.set(key, new Set())
    sourcesByKey.get(key)!.add(p.source)
  }
  const out = new Map<string, boolean>()
  for (const p of programs) {
    const key = normalizeProgramTitleKey(p.title)
    const sources = sourcesByKey.get(key)
    out.set(p.id, (sources?.size ?? 0) > 1)
  }
  return out
}
