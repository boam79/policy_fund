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
  if (max != null) return `최대 ${fmt(max)}`
  if (min != null) return `${fmt(min)} 이상`
  return null
}

/** 프로필 맞춤·스포트라이트 등 UI용 표시 점수 (DB 점수가 낮아도 순위 기반 보정) */
export function boostDisplayMatchScore(
  program: RecommendedProgram,
  options?: { rankIndex?: number; personalized?: boolean }
): number {
  const rank = options?.rankIndex ?? 0
  if (options?.personalized) {
    return Math.min(98, Math.max(program.matchScore, 92 - rank * 4))
  }
  if (program.matchScore >= 70) return program.matchScore
  return Math.min(95, Math.max(program.matchScore, 78 - rank * 3))
}
