import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { getPlan, type PlanId } from './plans'

type EventType = 'eligibility_check' | 'document_generate' | 'evaluation'

const EVENT_LIMIT_MAP: Record<EventType, keyof ReturnType<typeof getPlan>['limits']> = {
  eligibility_check: 'diagnoses_per_month',
  document_generate: 'documents_per_month',
  evaluation: 'evaluations_per_month',
}

/**
 * 사용량 확인 후 허용 여부 반환
 * server-side only (service role 필요)
 */
export async function checkUsageLimit(
  userId: string,
  eventType: EventType
): Promise<{ allowed: boolean; used: number; limit: number | null; plan: PlanId }> {
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 현재 플랜 조회
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan')
    .eq('user_id', userId)
    .single()
  const plan = getPlan((sub?.plan ?? 'free') as PlanId)
  const limitKey = EVENT_LIMIT_MAP[eventType]
  const limit = plan.limits[limitKey] as number | null

  if (limit === null) return { allowed: true, used: 0, limit: null, plan: plan.id }

  // 이번 달 사용량 조회
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
export async function recordUsage(userId: string, eventType: EventType): Promise<void> {
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  await supabase.from('usage_events').insert({ user_id: userId, event_type: eventType })
}
