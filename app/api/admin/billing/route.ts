import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { isAdminUser } from '@/lib/auth/admin'
import { normalizePlanId, type PlanId } from '@/lib/billing/plans'
import { createServiceRoleClient } from '@/lib/supabase/service-role-client'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    if (!(await isAdminUser())) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 })
    }

    const { searchParams } = request.nextUrl
    const statusFilter = searchParams.get('status') ?? 'all'
    const q = (searchParams.get('q') ?? '').trim()
    const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 100, 1), 500)

    const supabase = createServiceRoleClient()
    if (!supabase) {
      return NextResponse.json(
        { error: '관리자 결제 조회를 위해 SUPABASE_SERVICE_ROLE_KEY가 서버에 필요합니다.' },
        { status: 503 }
      )
    }

    const [
      { count: totalCount },
      { count: doneCount },
      { count: pendingCount },
      { count: failedCount },
      { count: canceledCount },
    ] = await Promise.all([
      supabase.from('payments').select('*', { count: 'exact', head: true }),
      supabase.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'done'),
      supabase.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'failed'),
      supabase.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'canceled'),
    ])

    let payQuery = supabase.from('payments').select('*').order('created_at', { ascending: false }).limit(limit)

    if (statusFilter !== 'all' && ['done', 'pending', 'failed', 'canceled'].includes(statusFilter)) {
      payQuery = payQuery.eq('status', statusFilter)
    }
    if (q) {
      const safe = q.replace(/%/g, '').replace(/,/g, '').replace(/\(/g, '').replace(/\)/g, '').slice(0, 80)
      if (safe) {
        payQuery = payQuery.or(`order_id.ilike.%${safe}%,order_name.ilike.%${safe}%`)
      }
    }

    const { data: payments, error: payError } = await payQuery
    if (payError) {
      return NextResponse.json({ error: '결제 데이터를 불러오지 못했습니다.' }, { status: 500 })
    }

    const list = payments ?? []
    const donePayments = list.filter((p) => p.status === 'done')

    const { data: subsRaw, error: subError } = await supabase
      .from('subscriptions')
      .select('id,user_id,plan_code,plan,status,current_period_end,current_period_start,cancel_at_period_end,updated_at,payment_provider')
      .order('updated_at', { ascending: false })
      .limit(300)

    if (subError) {
      return NextResponse.json({ error: '구독 데이터를 불러오지 못했습니다.' }, { status: 500 })
    }

    const seenUser = new Set<string>()
    const subs: NonNullable<typeof subsRaw> = []
    for (const s of subsRaw ?? []) {
      if (!s.user_id || seenUser.has(s.user_id)) continue
      seenUser.add(s.user_id)
      subs.push(s)
    }

    const planBreakdown: Record<PlanId, number> = { free: 0, starter: 0, pro: 0 }
    for (const s of subs) {
      const pid = normalizePlanId(String(s.plan_code ?? s.plan ?? 'free'))
      planBreakdown[pid] += 1
    }

    const { data: doneRows } = await supabase
      .from('payments')
      .select('amount_krw')
      .eq('status', 'done')

    const totalDoneAmount = (doneRows ?? []).reduce((sum, p) => sum + (p.amount_krw ?? 0), 0)

    return NextResponse.json({
      payments: list,
      subscriptions: subs,
      stats: {
        total: totalCount ?? 0,
        done: doneCount ?? 0,
        pending: pendingCount ?? 0,
        failed: failedCount ?? 0,
        canceled: canceledCount ?? 0,
        amount: totalDoneAmount,
        filteredAmount: donePayments.reduce((sum, p) => sum + (p.amount_krw ?? 0), 0),
      },
      planBreakdown,
    })
  } catch (err) {
    console.error('[api/admin/billing]', err)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
