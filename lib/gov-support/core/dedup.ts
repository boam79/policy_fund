/**
 * 공고 중복 제거 — PRD §19.5
 * 1차: source + external_id 동일 → 완전 중복
 * 2차: 제목·기관·마감일 기반 Jaccard 유사도 ≥ 0.7 → 중복 후보
 */

import type { NormalizedProgram } from './normalizer'

/** 문자열을 n-gram 집합으로 변환 */
function ngramSet(text: string, n = 2): Set<string> {
  const normalized = text.toLowerCase().replace(/\s+/g, '')
  const set = new Set<string>()
  for (let i = 0; i <= normalized.length - n; i++) {
    set.add(normalized.slice(i, i + n))
  }
  return set
}

/** Jaccard 유사도 (0 ~ 1) */
function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1
  const intersection = new Set([...a].filter((x) => b.has(x)))
  const union = new Set([...a, ...b])
  return intersection.size / union.size
}

function programSignature(p: NormalizedProgram): string {
  return `${p.title}|${p.organization}|${p.application_end_date ?? ''}`
}

/**
 * 중복 제거 후 unique 공고 목록 반환
 * - 같은 source+external_id: 첫 번째 유지
 * - Jaccard ≥ threshold 인 다른 source 공고: 먼저 나온 것 유지
 */
export function deduplicate(
  programs: NormalizedProgram[],
  threshold = 0.7
): NormalizedProgram[] {
  const seen = new Map<string, NormalizedProgram>()   // source:external_id → program
  const unique: NormalizedProgram[] = []
  const sigCache = new Map<number, Set<string>>()     // index → ngram set

  for (const prog of programs) {
    const exactKey = `${prog.source}:${prog.external_id}`
    if (seen.has(exactKey)) continue

    // Jaccard 비교
    const sig = programSignature(prog)
    const sigNgrams = ngramSet(sig)
    let isDuplicate = false

    for (let i = 0; i < unique.length; i++) {
      const existNgrams = sigCache.get(i)!
      if (jaccard(sigNgrams, existNgrams) >= threshold) {
        isDuplicate = true
        break
      }
    }

    if (!isDuplicate) {
      sigCache.set(unique.length, sigNgrams)
      unique.push(prog)
      seen.set(exactKey, prog)
    }
  }

  return unique
}
