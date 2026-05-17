import { isAdminUser } from '@/lib/auth/admin'
import { createServiceRoleClient } from '@/lib/supabase/service-role-client'

export const dynamic = 'force-dynamic'

/** 사이드바 배지용 경량 카운트 */
export async function GET() {
  if (!(await isAdminUser())) {
    return Response.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 })
  }

  const supabase = createServiceRoleClient()
  if (!supabase) {
    return Response.json({ error: 'SUPABASE_SERVICE_ROLE_KEY 필요' }, { status: 503 })
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [pending, processing, paidSubs, negativeFeedback] = await Promise.all([
    supabase
      .from('customer_inquiries')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'received'),
    supabase
      .from('customer_inquiries')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'in_progress'),
    supabase
      .from('subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .in('plan_code', ['starter', 'pro']),
    supabase
      .from('feedback')
      .select('id', { count: 'exact', head: true })
      .eq('rating', -1)
      .gte('created_at', sevenDaysAgo),
  ])

  const pendingCount = pending.count ?? 0
  const processingCount = processing.count ?? 0

  return Response.json({
    ok: true,
    inquiries: {
      pending: pendingCount,
      processing: processingCount,
      open: pendingCount + processingCount,
    },
    paidSubscribers: paidSubs.count ?? 0,
    negativeFeedback7d: negativeFeedback.count ?? 0,
  })
}
