import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { getPlan, normalizePlanId } from '@/lib/billing/plans'
import { getKakaoPayServerConfig, kakaoPaymentApprove } from '@/lib/billing/kakaopay'
import { takeRateLimit } from '@/lib/security/rateLimit'
import { createClient as createServerClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const rate = takeRateLimit(request, 'api:billing:kakao:confirm', { windowMs: 60_000, max: 10 })
    if (!rate.ok) {
      return NextResponse.json({ error: '요청이 너무 많습니다.' }, { status: 429 })
    }

    if (!getKakaoPayServerConfig().ready) {
      return NextResponse.json(
        { error: '카카오페이가 아직 활성화되지 않았습니다.' },
        { status: 503 }
      )
    }

    const serverClient = await createServerClient()
    const {
      data: { user },
    } = await serverClient.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const pgToken = typeof body.pg_token === 'string' ? body.pg_token.trim() : ''
    const orderId = typeof body.orderId === 'string' ? body.orderId.trim() : ''
    const plan = body.plan
    const amount = body.amount

    if (!pgToken || !orderId || amount == null || !plan) {
      return NextResponse.json({ error: '필수 파라미터 누락' }, { status: 400 })
    }

    const planNorm = normalizePlanId(String(plan))
    if (planNorm !== 'starter' && planNorm !== 'pro') {
      return NextResponse.json({ error: '유효하지 않은 플랜입니다.' }, { status: 400 })
    }

    const expectedAmount = getPlan(planNorm).price
    const amountNum = Number(amount)
    if (!Number.isFinite(amountNum) || amountNum !== expectedAmount) {
      return NextResponse.json({ error: '결제 금액이 선택한 플랜과 일치하지 않습니다.' }, { status: 400 })
    }

    if (orderId.length > 128 || !/^[a-zA-Z0-9_-]+$/.test(orderId)) {
      return NextResponse.json({ error: '유효하지 않은 주문 ID입니다.' }, { status: 400 })
    }

    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: pending, error: findError } = await supabase
      .from('payments')
      .select('id, provider_payment_id, status, amount_krw')
      .eq('user_id', user.id)
      .eq('order_id', orderId)
      .eq('payment_provider', 'kakaopay')
      .maybeSingle()

    if (findError || !pending) {
      return NextResponse.json({ error: '주문을 찾을 수 없습니다.' }, { status: 404 })
    }

    if (pending.status === 'done') {
      return NextResponse.json({ success: true, alreadyProcessed: true })
    }

    if (pending.status !== 'pending' || !pending.provider_payment_id) {
      return NextResponse.json({ error: '처리할 수 없는 주문 상태입니다.' }, { status: 400 })
    }

    if (pending.amount_krw !== expectedAmount) {
      return NextResponse.json({ error: '주문 금액이 일치하지 않습니다.' }, { status: 400 })
    }

    const tid = pending.provider_payment_id
    const { ok, data } = await kakaoPaymentApprove({
      tid,
      partner_order_id: orderId,
      partner_user_id: user.id,
      pg_token: pgToken,
    })

    if (!ok) {
      console.warn('[billing/kakao/confirm] approve failed', data)
      return NextResponse.json(
        { error: data.error_message ?? '카카오페이 승인에 실패했습니다.' },
        { status: 400 }
      )
    }

    if (data.partner_order_id !== orderId) {
      return NextResponse.json({ error: '주문 정보가 일치하지 않습니다.' }, { status: 400 })
    }

    if (typeof data.amount?.total === 'number' && data.amount.total !== expectedAmount) {
      return NextResponse.json({ error: '승인 금액이 일치하지 않습니다.' }, { status: 400 })
    }

    const now = new Date()
    const periodEnd = new Date(now)
    periodEnd.setMonth(periodEnd.getMonth() + 1)

    const orderName = data.item_name ?? `${getPlan(planNorm).name} 월 구독`

    await supabase
      .from('payments')
      .update({
        status: 'done',
        amount_krw: amountNum,
        order_name: orderName,
        provider_payment_id: data.tid,
        paid_at: now.toISOString(),
        metadata: { aid: data.aid, tid: data.tid },
      })
      .eq('id', pending.id)

    await supabase.from('subscriptions').upsert(
      {
        user_id: user.id,
        plan_code: planNorm,
        status: 'active',
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        payment_provider: 'kakaopay',
        updated_at: now.toISOString(),
      },
      { onConflict: 'user_id' }
    )

    const { data: sub } = await supabase.from('subscriptions').select('id').eq('user_id', user.id).single()
    if (sub) {
      await supabase.from('payments').update({ subscription_id: sub.id }).eq('id', pending.id)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[billing/kakao/confirm]', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
