/**
 * 공고 마감일(D-day) 계산·표시 공통 유틸
 */
export function computeDaysUntilDeadline(
  endDate: string | null | undefined,
  nowMs: number = Date.now()
): number | null {
  if (!endDate?.trim()) return null
  const raw = endDate.trim()
  const parsed = new Date(raw.length === 10 ? `${raw}T23:59:59.999` : raw)
  if (Number.isNaN(parsed.getTime())) return null
  return Math.ceil((parsed.getTime() - nowMs) / 86_400_000)
}

/** 카드 하단·추천 사유 문구 */
export function formatDeadlineRemainingMessage(daysLeft: number | null): string | null {
  if (daysLeft === null) return null
  if (daysLeft < 0) return '마감되었습니다.'
  if (daysLeft === 0) return '오늘 마감입니다.'
  return `마감이 ${daysLeft}일 남았습니다.`
}

/** 배지 라벨 (D-3, 오늘 마감, 마감) */
export function formatDeadlineBadgeLabel(
  daysLeft: number | null,
  opts?: { urgentSuffix?: boolean }
): string | null {
  if (daysLeft === null) return null
  if (daysLeft < 0) return '마감'
  if (daysLeft === 0) return opts?.urgentSuffix ? '오늘 마감' : 'D-Day'
  if (daysLeft <= 7 && opts?.urgentSuffix) return `D-${daysLeft} 마감임박`
  return `D-${daysLeft}`
}

export function deadlineBadgeClassName(daysLeft: number | null): string {
  if (daysLeft === null) return 'bg-slate-500 text-white'
  if (daysLeft < 0) return 'bg-gray-100 text-gray-500'
  if (daysLeft <= 7) return 'bg-red-500 text-white'
  if (daysLeft <= 15) return 'bg-orange-500 text-white'
  return 'bg-slate-500 text-white'
}
