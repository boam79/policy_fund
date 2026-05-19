import { NextResponse, type NextRequest } from 'next/server'
import { getPlan, normalizePlanId } from '@/lib/billing/plans'
import { applyNaverPayment, getNaverPayServerConfig } from '@/lib/billing/naverpay'
import { finalizeSubscription } from '@/lib/billing/finalizeSubscription'
import { takeRateLimit } from '@/lib/security/rateLimit'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { requireServiceRoleClient } from '@/lib/supabase/serviceRole'
import type { Database } from '@/types/database.types'

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

    const supabase = requireServiceRoleClient()

    const { data: pending, error: findError } = await supabase
      .from('payments')
      .select('id, status, amount_krw, user_id')
      .eq('user_id', user.id)
      .eq('order_id', orderId)
      .eq('payment_provider', 'naverpay')
      .maybeSingle()

    if (findError || !pending) {
      return NextResponse.json({ error: '주문을 찾을 수 없습니다.' }, { status: 404 })
    }

    if (pending.status === 'done') {
      return NextResponse.json({ success: true, alreadyProcessed: true })
    }

    if (pending.status !== 'pending') {
      return NextResponse.json({ error: '처리할 수 없는 주문 상태입니다.' }, { status: 400 })
    }

    if (pending.amount_krw !== expectedAmount) {
      return NextResponse.json({ error: '주문 금액이 일치하지 않습니다.' }, { status: 400 })
    }

    const { data: reusedPayment } = await supabase
      .from('payments')
      .select('id')
      .eq('provider_payment_id', paymentId)
      .eq('status', 'done')
      .maybeSingle()

    if (reusedPayment) {
      return NextResponse.json({ error: '이미 처리된 결제입니다.' }, { status: 409 })
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
    if (detail?.merchantPayKey && detail.merchantPayKey !== orderId) {
      return NextResponse.json({ error: '주문 정보가 일치하지 않습니다.' }, { status: 400 })
    }
    if (detail?.merchantUserKey && detail.merchantUserKey !== user.id) {
      return NextResponse.json({ error: '결제 사용자 정보가 일치하지 않습니다.' }, { status: 403 })
    }
    if (typeof detail?.totalPayAmount === 'number' && detail.totalPayAmount !== expectedAmount) {
      return NextResponse.json({ error: '승인 금액이 일치하지 않습니다.' }, { status: 400 })
    }

    const orderName = detail?.productName ?? `${getPlan(planNorm).name} 월 구독`

    await finalizeSubscription({
      supabase,
      userId: user.id,
      pendingPaymentId: pending.id,
      planNorm,
      amountNum,
      orderName,
      paymentProvider: 'naverpay',
      providerPaymentId: paymentId,
      metadata: JSON.parse(
        JSON.stringify({ plan: planNorm, naver_detail: detail ?? null })
      ) as Database['public']['Tables']['payments']['Row']['metadata'],
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[billing/confirm]', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
