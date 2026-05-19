import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import type { RecommendedProgram } from '@/lib/home/recommendations'
import { runProgramSearch } from '@/lib/gov-support/tools/runProgramSearch'
import {
  buildSearchUrlFromProfile,
  type SavedBusinessProfileDefaults,
} from '@/lib/profile/business-profile-defaults'
import { getServiceRoleClient } from '@/lib/supabase/serviceRole'
import { mapRowsToRecommendedPrograms, fetchRecommendedPrograms } from '@/lib/home/recommendations'
import { fetchClosingSoonList, type HomeProgramListItem } from '@/lib/home/lists'
import { HOME_MEMBER_PROGRAM_LIMIT } from '@/lib/home/program-display'

const PROFILE_SELECT =
  'region,city,industry,business_age_years,employee_count,company_name,support_purpose' as const

function mergeSpotlightPrograms(
  personalized: RecommendedProgram[],
  generic: RecommendedProgram[],
  limit: number
): RecommendedProgram[] {
  const seen = new Set<string>()
  const merged: RecommendedProgram[] = []

  for (const program of [...personalized, ...generic]) {
    if (merged.length >= limit) break
    if (seen.has(program.id)) continue
    seen.add(program.id)
    merged.push(program)
  }

  return merged
}

export type MemberHomeData = {
  profile: SavedBusinessProfileDefaults | null
  profileSearchUrl: string | null
  personalizedPrograms: RecommendedProgram[]
  personalizedFromProfile: boolean
  closingSoon: HomeProgramListItem[]
  spotlightPrograms: RecommendedProgram[]
}

export async function fetchBusinessProfile(
  userId: string
): Promise<SavedBusinessProfileDefaults | null> {
  const service = getServiceRoleClient()
  if (!service) return null
  const supabase = service

  const { data, error } = await supabase
    .from('business_profiles')
    .select(PROFILE_SELECT)
    .eq('user_id', userId)
    .maybeSingle()

  if (error || !data) return null
  return data as SavedBusinessProfileDefaults
}

async function fetchPersonalizedFromProfile(
  profile: SavedBusinessProfileDefaults
): Promise<RecommendedProgram[]> {
  const service = getServiceRoleClient()
  if (!service) return []

  try {
    const { result } = await runProgramSearch(
      {
        region: profile.region?.trim() || undefined,
        city: profile.city?.trim() || undefined,
        industry: profile.industry?.trim() || undefined,
        business_age_years: profile.business_age_years ?? undefined,
        employee_count: profile.employee_count ?? undefined,
        support_purpose: profile.support_purpose?.trim() || undefined,
        limit: HOME_MEMBER_PROGRAM_LIMIT,
        page: 1,
      },
      'relaxed'
    )

    if (!result.programs.length) return []

    return mapRowsToRecommendedPrograms(
      result.programs.map((p) => ({
        id: p.id,
        source: p.source,
        title: p.title,
        organization: p.organization,
        region: p.region,
        support_type: p.support_type,
        summary_text: p.summary_text ?? null,
        support_amount: p.support_amount ?? null,
        support_amount_min_krw: p.support_amount_min_krw ?? null,
        support_amount_max_krw: p.support_amount_max_krw ?? null,
        application_end_date: p.application_end_date,
        application_url: p.application_url,
        status: p.status,
        recommendation_score: p.recommendation_score,
      }))
    ).map((p, index) => ({
      ...p,
      matchScore: Math.min(98, Math.max(p.matchScore, 92 - index * 4)),
      recommendReason: '프로필 조건에 맞는 공고입니다.',
    }))
  } catch {
    return []
  }
}

export async function fetchMemberHomeData(userId: string): Promise<MemberHomeData> {
  const publicClient = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [profile, closingSoon, generic] = await Promise.all([
    fetchBusinessProfile(userId),
    fetchClosingSoonList(publicClient, 5),
    fetchRecommendedPrograms(publicClient, HOME_MEMBER_PROGRAM_LIMIT),
  ])

  const profileSearchUrl = profile ? buildSearchUrlFromProfile(profile) : null

  let personalizedPrograms: RecommendedProgram[] = []
  let personalizedFromProfile = false

  if (profile) {
    personalizedPrograms = await fetchPersonalizedFromProfile(profile)
    personalizedFromProfile = personalizedPrograms.length > 0
  }

  const spotlightPrograms = mergeSpotlightPrograms(
    personalizedPrograms,
    generic,
    HOME_MEMBER_PROGRAM_LIMIT
  )

  return {
    profile,
    profileSearchUrl,
    personalizedPrograms,
    personalizedFromProfile,
    closingSoon,
    spotlightPrograms,
  }
}
