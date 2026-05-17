import type { CompanyProfile } from '@/lib/gov-support/tools/eligibility'
import {
  parseBusinessAgeConstraints,
  profileMatchesBusinessAgeConstraints,
} from '@/lib/eligibility/parseBusinessAge'

type SortableProgram = {
  recommendation_score?: number | null
  eligibility?: { score?: number }
  days_left?: number | null
  region?: string | null
  title?: string | null
  eligibility_text?: string | null
}

function regionMatchBoost(profile: CompanyProfile, program: SortableProgram): number {
  if (!profile.region?.trim()) return 0
  const prof = (profile.region + (profile.city ?? '')).toLowerCase()
  const progRegion = (program.region ?? program.title ?? '').toLowerCase()
  if (!progRegion) return 0
  if (progRegion.includes('전국')) return 2
  if (progRegion.includes(profile.region.slice(0, 2).toLowerCase())) return 5
  if (prof.length >= 2 && progRegion.includes(prof.slice(0, 2))) return 4
  return 0
}

function businessAgeSoftBoost(profile: CompanyProfile, program: SortableProgram): number {
  if (profile.business_age_years == null || profile.business_age_years === undefined) return 0
  const constraints = parseBusinessAgeConstraints(program.eligibility_text ?? null)
  const match = profileMatchesBusinessAgeConstraints(profile.business_age_years, constraints)
  if (match === true) return 8
  if (match === false) return -6
  return 0
}

function closingSoonBoost(daysLeft: number | null | undefined): number {
  if (daysLeft == null || daysLeft < 0) return -20
  if (daysLeft <= 3) return 12
  if (daysLeft <= 7) return 8
  if (daysLeft <= 14) return 4
  return 0
}

/** 검색 결과 카드 정렬 — 추천점수·자격·업력 soft·마감·지역 */
export function sortSearchResultPrograms<T extends SortableProgram>(
  programs: T[],
  profile: CompanyProfile
): T[] {
  return [...programs].sort((a, b) => {
    const recA = a.recommendation_score ?? 0
    const recB = b.recommendation_score ?? 0
    if (recB !== recA) return recB - recA

    const eligA = a.eligibility?.score ?? 0
    const eligB = b.eligibility?.score ?? 0
    if (eligB !== eligA) return eligB - eligA

    const softA =
      businessAgeSoftBoost(profile, a) + regionMatchBoost(profile, a) + closingSoonBoost(a.days_left)
    const softB =
      businessAgeSoftBoost(profile, b) + regionMatchBoost(profile, b) + closingSoonBoost(b.days_left)
    if (softB !== softA) return softB - softA

    const daysA = a.days_left
    const daysB = b.days_left
    if (daysA != null && daysB != null && daysA !== daysB) return daysA - daysB
    if (daysA != null && daysB == null) return -1
    if (daysA == null && daysB != null) return 1

    return 0
  })
}
