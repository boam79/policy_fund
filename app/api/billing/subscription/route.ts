import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ plan: 'free', status: 'active' })

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan,status,current_period_end,cancel_at_period_end')
    .eq('user_id', user.id)
    .single()

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

  return NextResponse.json({
    subscription: sub ?? { plan: 'free', status: 'active' },
    payments: payments ?? [],
    usage: { eligibility_check: diagCount ?? 0, document_generate: docCount ?? 0 },
  })
}
