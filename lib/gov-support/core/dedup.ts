/**
 * 공고 중복 제거 — PRD §19.5
 *
 * 기존에는 출처가 달라도 제목/기관/마감일 유사도(Jaccard)만으로 합쳐
 * 실제 공고 수가 과도하게 줄어드는 문제가 있었다.
 *
 * 운영 정책:
 * - source + external_id 가 같은 경우만 중복으로 본다.
 * - 출처가 다르면 같은 공고처럼 보여도 일단 유지한다.
 */

import type { NormalizedProgram } from './normalizer'

/**
 * 중복 제거 후 unique 공고 목록 반환
 * - 같은 source+external_id: 첫 번째 유지
 * - 출처가 다르면 별도 공고로 유지
 */
export function deduplicate(
  programs: NormalizedProgram[],
  _threshold = 0.7
): NormalizedProgram[] {
  const seen = new Map<string, NormalizedProgram>()   // source:external_id → program
  const unique: NormalizedProgram[] = []

  for (const prog of programs) {
    const exactKey = `${prog.source}:${prog.external_id}`
    if (seen.has(exactKey)) continue
    unique.push(prog)
    seen.set(exactKey, prog)
  }

  return unique
}
