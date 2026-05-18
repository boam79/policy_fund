import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { isAdminUser } from '@/lib/auth/admin'
import { betaGrantsFullAccess, isBetaOpenAccessEnabled } from '@/lib/billing/betaAccess'
import { normalizePlanId, type PlanId } from '@/lib/billing/plans'
import {
  createAdminAuthClient,
  invalidateUserSummaryCache,
  loadSubByUser,
  loadUsageByUser,
  mapAuthUser,
  startOfMonthOffset,
} from '@/lib/admin/userDirectory'

export const dynamic = 'force-dynamic'

type RouteCtx = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, ctx: RouteCtx) {
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 })
  }

  const { id } = await ctx.params
  const admin = createAdminAuthClient()
  if (!admin) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY 필요' }, { status: 503 })
  }

  const { data: authData, error: authErr } = await admin.auth.admin.getUserById(id)
  if (authErr || !authData?.user) {
    return NextResponse.json({ error: '회원을 찾을 수 없습니다.' }, { status: 404 })
  }

  const subByUser = await loadSubByUser(admin)
  const thisMonth = startOfMonthOffset(0)
  const lastMonth = startOfMonthOffset(1)

  const usageThis = await loadUsageByUser(admin, [id], thisMonth)
  const usageLast = await loadUsageByUser(admin, [id], lastMonth)
  const emptyUsage = { eligibility_check: 0, document_generate: 0, evaluation: 0 }

  const user = mapAuthUser(authData.user, subByUser, usageThis[id] ?? emptyUsage)

  const [
    profileRes,
    alertRes,
    inquiriesRes,
    feedbackRes,
    savedRes,
    firstUsageRes,
    subRowRes,
  ] = await Promise.all([
    admin.from('business_profiles').select('*').eq('user_id', id).maybeSingle(),
    admin.from('alert_profiles').select('*').eq('user_id', id).maybeSingle(),
    admin
      .from('customer_inquiries')
      .select('id,subject,status,created_at,inquiry_type')
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(8),
    admin.from('feedback').select('id', { count: 'exact', head: true }).eq('user_id', id),
    admin.from('saved_programs').select('id', { count: 'exact', head: true }).eq('user_id', id),
    admin
      .from('usage_events')
      .select('event_type,created_at')
      .eq('user_id', id)
      .order('created_at', { ascending: true })
      .limit(1),
    admin
      .from('subscriptions')
      .select('started_at,created_at,status,plan_code')
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const firstUsage = firstUsageRes.data?.[0]
  const subRow = subRowRes.data

  const timeline: { label: string; at: string | null }[] = [
    { label: '가입', at: user.created_at },
    { label: '첫 활동', at: firstUsage?.created_at ?? null },
    { label: '구독 시작', at: subRow?.started_at ?? subRow?.created_at ?? null },
  ]
  if (user.last_sign_in_at) {
    timeline.push({ label: '마지막 로그인', at: user.last_sign_in_at })
  }

  return NextResponse.json({
    user,
    usageLastMonth: usageLast[id] ?? emptyUsage,
    businessProfile: profileRes.data ?? null,
    alertProfile: alertRes.data ?? null,
    inquiries: inquiriesRes.data ?? [],
    inquiryCount: inquiriesRes.data?.length ?? 0,
    feedbackCount: feedbackRes.count ?? 0,
    savedProgramsCount: savedRes.count ?? 0,
    timeline,
    beta: {
      openAccessEnabled: isBetaOpenAccessEnabled(),
      grantsFullAccess: betaGrantsFullAccess(id),
    },
  })
}

export async function PATCH(request: NextRequest, ctx: RouteCtx) {
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 })
  }

  const { id } = await ctx.params
  const body = (await request.json().catch(() => ({}))) as { plan_code?: string }
  const planCode = normalizePlanId(String(body.plan_code ?? '')) as PlanId
  if (!['free', 'starter', 'pro'].includes(planCode)) {
    return NextResponse.json({ error: '유효하지 않은 플랜입니다.' }, { status: 400 })
  }

  const admin = createAdminAuthClient()
  if (!admin) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY 필요' }, { status: 503 })
  }

  const { data: existing } = await admin
    .from('subscriptions')
    .select('id')
    .eq('user_id', id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const now = new Date().toISOString()
  if (planCode === 'free') {
    if (existing?.id) {
      await admin
        .from('subscriptions')
        .update({
          plan_code: 'free',
          plan: 'free',
          status: 'canceled',
          updated_at: now,
          payment_provider: 'admin_override',
        })
        .eq('id', existing.id)
    }
  } else if (existing?.id) {
    await admin
      .from('subscriptions')
      .update({
        plan_code: planCode,
        plan: planCode,
        status: 'active',
        updated_at: now,
        payment_provider: 'admin_override',
        cancel_at_period_end: false,
      })
      .eq('id', existing.id)
  } else {
    await admin.from('subscriptions').insert({
      user_id: id,
      plan_code: planCode,
      plan: planCode,
      status: 'active',
      payment_provider: 'admin_override',
      started_at: now,
      current_period_start: now,
    })
  }

  invalidateUserSummaryCache()
  return NextResponse.json({ ok: true, plan_code: planCode })
}
