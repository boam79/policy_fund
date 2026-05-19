/**
 * GET /api/home/spotlight — 로그인 홈 추천 공고 (키워드·프로필 기반)
 */
import { createClient } from '@/lib/supabase/server'
import {
  fetchRecommendedPrograms,
  mapRowsToRecommendedPrograms,
  type RecommendedProgram,
} from '@/lib/home/recommendations'
import { HOME_MEMBER_PROGRAM_LIMIT } from '@/lib/home/program-display'
import { fetchBusinessProfile } from '@/lib/home/member-feed'
import { runProgramSearch } from '@/lib/gov-support/tools/runProgramSearch'
import {
  buildGenericRecommendReason,
  buildPersonalizedRecommendReason,
  isProfileCompleteForRecommendations,
} from '@/lib/home/recommendReason'
import { createClient as createPublicClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

export const dynamic = 'force-dynamic'

function publicSupabase() {
  return createPublicClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

async function programsFromKeyword(keyword: string): Promise<RecommendedProgram[]> {
  const { result } = await runProgramSearch({ keyword, limit: HOME_MEMBER_PROGRAM_LIMIT, page: 1 }, 'relaxed')
  if (!result.programs.length) return []
  return mapRowsToRecommendedPrograms(
    result.programs.map((p) => ({
      id: p.id,
      source: p.source,
      title: p.title,
      organization: p.organization,
      region: p.region,
      industry: p.industry ?? null,
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
  ).map((p) => ({ ...p, recommendReason: `「${keyword}」 검색 결과` }))
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ ok: false, message: '로그인이 필요합니다.' }, { status: 401 })
  }

  const url = new URL(request.url)
  const keyword = url.searchParams.get('keyword')?.trim()

  const pub = publicSupabase()
  const generic = await fetchRecommendedPrograms(pub, HOME_MEMBER_PROGRAM_LIMIT)
  const profile = await fetchBusinessProfile(user.id)

  let personalized: RecommendedProgram[] = []
  let personalizedFromProfile = false

  if (keyword) {
    personalized = await programsFromKeyword(keyword)
  } else if (profile && isProfileCompleteForRecommendations(profile)) {
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
    if (result.programs.length) {
      personalized = mapRowsToRecommendedPrograms(
        result.programs.map((p) => ({
          id: p.id,
          source: p.source,
          title: p.title,
          organization: p.organization,
          region: p.region,
          industry: p.industry ?? null,
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
      ).map((p) => ({
        ...p,
        recommendReason: buildPersonalizedRecommendReason(p, profile),
      }))
      personalizedFromProfile = true
    }
  }

  const seen = new Set<string>()
  const programs: RecommendedProgram[] = []
  for (const p of [...personalized, ...generic.map((g) => ({ ...g, recommendReason: buildGenericRecommendReason(g) }))]) {
    if (programs.length >= HOME_MEMBER_PROGRAM_LIMIT) break
    if (seen.has(p.id)) continue
    seen.add(p.id)
    programs.push(p)
  }

  return Response.json({
    ok: true,
    programs,
    personalizedFromProfile: keyword ? false : personalizedFromProfile,
    keyword: keyword ?? null,
  })
}
