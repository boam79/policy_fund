import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { getPlan, normalizePlanId, type PlanId } from './plans'

export type UsageEventType =
  | 'eligibility_check'
  | 'document_generate'
  | 'evaluation'
  | 'parse_query'
  | 'search_request'

const MONTHLY_LIMIT_MAP: Record<
  Exclude<UsageEventType, 'parse_query' | 'search_request'>,
  keyof ReturnType<typeof getPlan>['limits']
> = {
  eligibility_check: 'diagnoses_per_month',
  document_generate: 'documents_per_month',
  evaluation: 'evaluations_per_month',
}

const DAILY_LIMIT_MAP: Record<'parse_query' | 'search_request', keyof ReturnType<typeof getPlan>['limits']> =
  {
    parse_query: 'parse_queries_per_day',
    search_request: 'search_requests_per_day',
  }

export type DailyUsageEventType = keyof typeof DAILY_LIMIT_MAP

function serviceSupabase() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
  }
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/**
 * 구독 행에서 결제 플랜 ID (plan_code 우선, 레거시 plan 폴백)
 */
export async function getPlanIdForUser(userId: string): Promise<PlanId> {
  const supabase = serviceSupabase()
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan_code, plan')
    .eq('user_id', userId)
    .maybeSingle()
  const raw = sub?.plan_code ?? sub?.plan ?? 'free'
  return normalizePlanId(String(raw))
}

/**
 * 사용량 확인 후 허용 여부 반환
 * server-side only (service role 필요)
 */
function startOfTodayIso(): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function startOfMonthIso(): string {
  const d = new Date()
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

export async function checkUsageLimit(
  userId: string,
  eventType: Exclude<UsageEventType, DailyUsageEventType>
): Promise<{ allowed: boolean; used: number; limit: number | null; plan: PlanId }> {
  const supabase = serviceSupabase()

  const planId = await getPlanIdForUser(userId)
  const plan = getPlan(planId)
  const limitKey = MONTHLY_LIMIT_MAP[eventType]
  const limit = plan.limits[limitKey] as number | null

  if (limit === null) return { allowed: true, used: 0, limit: null, plan: plan.id }

  const { count } = await supabase
    .from('usage_events')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('event_type', eventType)
    .gte('created_at', startOfMonthIso())

  const used = count ?? 0
  return { allowed: used < limit, used, limit, plan: plan.id }
}

/** 일일 parse·search 한도 (Free 플랜) */
export async function checkDailyUsageLimit(
  userId: string,
  eventType: DailyUsageEventType
): Promise<{ allowed: boolean; used: number; limit: number | null; plan: PlanId }> {
  const supabase = serviceSupabase()
  const planId = await getPlanIdForUser(userId)
  const plan = getPlan(planId)
  const limitKey = DAILY_LIMIT_MAP[eventType]
  const limit = plan.limits[limitKey] as number | null

  if (limit === null) return { allowed: true, used: 0, limit: null, plan: plan.id }

  const { count } = await supabase
    .from('usage_events')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('event_type', eventType)
    .gte('created_at', startOfTodayIso())

  const used = count ?? 0
  return { allowed: used < limit, used, limit, plan: plan.id }
}

/**
 * 사용량 이벤트 기록
 */
export async function recordUsage(userId: string, eventType: UsageEventType): Promise<void> {
  try {
    const supabase = serviceSupabase()
    const { error } = await supabase.from('usage_events').insert({ user_id: userId, event_type: eventType })
    if (error) console.error('[recordUsage]', eventType, error.message)
  } catch (e) {
    console.error('[recordUsage]', eventType, e)
  }
}
