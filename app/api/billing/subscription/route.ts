import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { normalizePlanId, type PlanId } from '@/lib/billing/plans'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ plan: 'free', status: 'active' })

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan_code,plan,status,current_period_end,cancel_at_period_end')
    .eq('user_id', user.id)
    .maybeSingle()

  const { data: payments } = await supabase
    .from('payments')
    .select('id,order_name,amount_krw,status,paid_at,order_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  // 이번 달 사용량
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { count: diagCount } = await supabase
    .from('usage_events')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('event_type', 'eligibility_check')
    .gte('created_at', startOfMonth.toISOString())

  const { count: docCount } = await supabase
    .from('usage_events')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('event_type', 'document_generate')
    .gte('created_at', startOfMonth.toISOString())

  const { count: evalCount } = await supabase
    .from('usage_events')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('event_type', 'evaluation')
    .gte('created_at', startOfMonth.toISOString())

  const plan: PlanId = normalizePlanId(String(sub?.plan_code ?? sub?.plan ?? 'free'))

  return NextResponse.json({
    subscription: sub
      ? {
          plan,
          status: sub.status,
          current_period_end: sub.current_period_end,
          cancel_at_period_end: sub.cancel_at_period_end,
        }
      : { plan: 'free' as PlanId, status: 'active' },
    payments: payments ?? [],
    usage: {
      eligibility_check: diagCount ?? 0,
      document_generate: docCount ?? 0,
      evaluation: evalCount ?? 0,
    },
  })
}
