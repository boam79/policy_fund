import type { SavedBusinessProfileDefaults } from '@/lib/profile/business-profile-defaults'
import type { RecommendedProgram } from '@/lib/home/recommendations'

export function isProfileCompleteForRecommendations(
  profile: SavedBusinessProfileDefaults | null | undefined
): boolean {
  if (!profile) return false
  return Boolean(profile.region?.trim() && profile.industry?.trim())
}

export function buildPersonalizedRecommendReason(
  program: RecommendedProgram,
  profile: SavedBusinessProfileDefaults
): string {
  const parts: string[] = []
  if (profile.region?.trim() && program.region?.includes(profile.region.trim())) {
    parts.push('지역 일치')
  }
  if (profile.industry?.trim() && program.industry?.includes(profile.industry.trim())) {
    parts.push('업종 일치')
  }
  if (program.days_left !== null && program.days_left <= 7 && program.days_left >= 0) {
    parts.push(program.days_left === 0 ? '오늘 마감' : `D-${program.days_left}`)
  }
  if (parts.length === 0) return '프로필 조건에 맞는 공고입니다.'
  return parts.join(' · ')
}

export function buildGenericRecommendReason(program: RecommendedProgram): string {
  if (program.days_left !== null && program.days_left <= 7 && program.days_left >= 0) {
    return program.days_left === 0 ? '마감 임박 · 오늘 마감' : `마감 임박 · D-${program.days_left}`
  }
  if (program.status === 'closing_soon') return '마감 임박 공고'
  return '인기·추천 점수 상위 공고 (프로필 저장 시 맞춤 추천)'
}
