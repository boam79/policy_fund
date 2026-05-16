import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { getPlan, normalizePlanId, type PlanId } from './plans'

export type UsageEventType = 'eligibility_check' | 'document_generate' | 'evaluation'

const EVENT_LIMIT_MAP: Record<UsageEventType, keyof ReturnType<typeof getPlan>['limits']> = {
  eligibility_check: 'diagnoses_per_month',
  document_generate: 'documents_per_month',
  evaluation: 'evaluations_per_month',
}

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
export async function checkUsageLimit(
  userId: string,
  eventType: UsageEventType
): Promise<{ allowed: boolean; used: number; limit: number | null; plan: PlanId }> {
  const supabase = serviceSupabase()

  const planId = await getPlanIdForUser(userId)
  const plan = getPlan(planId)
  const limitKey = EVENT_LIMIT_MAP[eventType]
  const limit = plan.limits[limitKey] as number | null

  if (limit === null) return { allowed: true, used: 0, limit: null, plan: plan.id }

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { count } = await supabase
    .from('usage_events')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('event_type', eventType)
    .gte('created_at', startOfMonth.toISOString())

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
