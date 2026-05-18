import type { RecommendedProgram } from '@/lib/home/recommendations'

export function formatProgramSupportAmount(
  support_amount: string | null | undefined,
  min: number | null | undefined,
  max: number | null | undefined
): string | null {
  if (support_amount?.trim()) return support_amount.trim()

  const fmt = (n: number) => {
    if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(0)}억원`
    if (n >= 10_000) return `${(n / 10_000).toLocaleString('ko-KR')}만원`
    return `${n.toLocaleString('ko-KR')}원`
  }

  if (min != null && max != null) {
    if (min === max) return fmt(min)
    return `${fmt(min)} ~ ${fmt(max)}`
  }
  if (max != null) return fmt(max)
  if (min != null) return fmt(min)
  return null
}

/** 비로그인 홈 카드 목업 고정 매칭 % (78 → 57, 8칸) */
export function guestCardMatchScore(rankIndex: number): number {
  return Math.max(57, 78 - rankIndex * 3)
}

/** 비로그인 홈 추천 공고 노출 개수 */
export const HOME_GUEST_PROGRAM_LIMIT = 8

/** 프로필 맞춤·스포트라이트 등 UI용 표시 점수 */
export function boostDisplayMatchScore(
  program: RecommendedProgram,
  options?: { rankIndex?: number; personalized?: boolean; guest?: boolean }
): number {
  if (options?.guest) return guestCardMatchScore(options.rankIndex ?? 0)

  const rank = options?.rankIndex ?? 0
  if (options?.personalized) {
    return Math.min(98, Math.max(program.matchScore, 92 - rank * 4))
  }
  if (program.matchScore >= 70) return program.matchScore
  return Math.min(95, Math.max(program.matchScore, 78 - rank * 3))
}
