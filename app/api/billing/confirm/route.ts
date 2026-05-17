import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { getPlan, normalizePlanId } from '@/lib/billing/plans'
import { applyNaverPayment, getNaverPayServerConfig } from '@/lib/billing/naverpay'
import { takeRateLimit } from '@/lib/security/rateLimit'
import { createClient as createServerClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const rate = takeRateLimit(request, 'api:billing:confirm', { windowMs: 60_000, max: 10 })
    if (!rate.ok) {
      return NextResponse.json({ error: '요청이 너무 많습니다.' }, { status: 429 })
    }

    const naverCfg = getNaverPayServerConfig()
    if (!naverCfg.ready) {
      return NextResponse.json(
        { error: '결제 시스템이 아직 활성화되지 않았습니다. 관리자에게 문의해주세요.' },
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
    const paymentId = typeof body.paymentId === 'string' ? body.paymentId.trim() : ''
    const orderId = typeof body.orderId === 'string' ? body.orderId.trim() : ''
    const amount = body.amount
    const plan = body.plan

    if (!paymentId || !orderId || amount == null || !plan) {
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
    if (paymentId.length > 50) {
      return NextResponse.json({ error: '유효하지 않은 결제 번호입니다.' }, { status: 400 })
    }

    const { ok, data } = await applyNaverPayment(paymentId)
    if (!ok) {
      console.warn('[billing/confirm] naver apply failed', data)
      return NextResponse.json(
        { error: data.message ?? '결제 승인에 실패했습니다. 다시 시도해주세요.' },
        { status: 400 }
      )
    }

    const detail = data.body?.detail
    if (
      detail?.merchantPayKey &&
      detail.merchantPayKey !== orderId
    ) {
      return NextResponse.json({ error: '주문 정보가 일치하지 않습니다.' }, { status: 400 })
    }
    if (
      typeof detail?.totalPayAmount === 'number' &&
      detail.totalPayAmount !== expectedAmount
    ) {
      return NextResponse.json({ error: '승인 금액이 일치하지 않습니다.' }, { status: 400 })
    }

    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const now = new Date()
    const periodEnd = new Date(now)
    periodEnd.setMonth(periodEnd.getMonth() + 1)

    const orderName = detail?.productName ?? `${getPlan(planNorm).name} 월 구독`

    const { data: paymentRecord } = await supabase.from('payments').insert({
      user_id: user.id,
      amount_krw: amountNum,
      status: 'done',
      payment_provider: 'naverpay',
      provider_payment_id: paymentId,
      order_id: orderId,
      order_name: orderName,
      paid_at: new Date().toISOString(),
    }).select('id').single()

    await supabase.from('subscriptions').upsert({
      user_id: user.id,
      plan_code: planNorm,
      status: 'active',
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      payment_provider: 'naverpay',
      updated_at: now.toISOString(),
    }, { onConflict: 'user_id' })

    if (paymentRecord) {
      const { data: sub } = await supabase.from('subscriptions').select('id').eq('user_id', user.id).single()
      if (sub) await supabase.from('payments').update({ subscription_id: sub.id }).eq('id', paymentRecord.id)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[billing/confirm]', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
