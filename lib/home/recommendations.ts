import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import {
  computeDaysUntilDeadline,
  formatDeadlineRemainingMessage,
} from '@/lib/programs/deadline'
import {
  PROGRAM_SEARCH_POOL_STATUSES,
  programSearchPoolEndDateOr,
  todayISODate,
} from '@/lib/gov-support/tools/programSearchPool'
export interface RecommendedProgram {
  id: string
  source: string
  title: string
  organization: string | null
  region: string | null
  industry: string | null
  support_type: string | null
  support_amount: string | null
  support_amount_min_krw: number | null
  support_amount_max_krw: number | null
  application_end_date: string | null
  application_url: string | null
  status: string
  days_left: number | null
  matchScore: number
  recommendReason: string
  summary_text: string | null
}

type ProgramRow = Pick<
  Database['public']['Tables']['support_programs']['Row'],
  | 'id'
  | 'source'
  | 'title'
  | 'organization'
  | 'region'
  | 'industry'
  | 'support_type'
  | 'support_amount'
  | 'support_amount_min_krw'
  | 'support_amount_max_krw'
  | 'application_end_date'
  | 'application_url'
  | 'status'
  | 'recommendation_score'
  | 'summary_text'
>

const PROGRAM_SELECT =
  'id, source, title, organization, region, industry, support_type, support_amount, support_amount_min_krw, support_amount_max_krw, application_end_date, application_url, status, recommendation_score, summary_text' as const

export function mapRowsToRecommendedPrograms(rows: ProgramRow[]): RecommendedProgram[] {
  const now = Date.now()
  return rows.map((p) => {
    const daysLeft = computeDaysUntilDeadline(p.application_end_date, now)

    let matchScore = typeof p.recommendation_score === 'number' ? p.recommendation_score : 50
    if (p.status === 'closing_soon') matchScore += 10
    if (daysLeft !== null && daysLeft <= 7 && daysLeft >= 0) matchScore += 5
    matchScore = Math.min(100, Math.max(0, matchScore))

    let recommendReason = '현재 모집 중인 공고입니다.'
    const deadlineMsg = formatDeadlineRemainingMessage(daysLeft)
    if (p.status === 'closing_soon' && deadlineMsg) {
      recommendReason = deadlineMsg
    } else if (daysLeft !== null && daysLeft <= 14 && daysLeft >= 0) {
      recommendReason = '마감 임박 공고입니다.'
    } else if (typeof p.recommendation_score === 'number' && p.recommendation_score >= 80) {
      recommendReason = '추천 점수 상위 공고입니다.'
    }

    return {
      id: p.id,
      source: p.source,
      title: p.title,
      organization: p.organization,
      region: p.region,
      industry: p.industry,
      support_type: p.support_type,
      support_amount: p.support_amount,
      support_amount_min_krw: p.support_amount_min_krw,
      support_amount_max_krw: p.support_amount_max_krw,
      application_end_date: p.application_end_date,
      application_url: p.application_url,
      status: p.status ?? 'active',
      days_left: daysLeft,
      matchScore,
      recommendReason,
      summary_text: p.summary_text,
    }
  })
}

export async function fetchRecommendedPrograms(
  supabase: SupabaseClient<Database>,
  limit = 8
): Promise<RecommendedProgram[]> {
  const today = todayISODate()
  const { data, error } = await supabase
    .from('support_programs')
    .select(PROGRAM_SELECT)
    .eq('visibility_status', 'visible')
    .in('status', [...PROGRAM_SEARCH_POOL_STATUSES])
    .or(programSearchPoolEndDateOr(today))
    .not('application_url', 'is', null)
    .order('recommendation_score', { ascending: false })
    .order('application_end_date', { ascending: true })
    .limit(limit)

  if (error || !data) return []
  return mapRowsToRecommendedPrograms(data)
}
