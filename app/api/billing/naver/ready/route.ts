import { NextResponse, type NextRequest } from 'next/server'
import { normalizePlanId } from '@/lib/billing/plans'
import { getNaverPayServerConfig } from '@/lib/billing/naverpay'
import { createPendingOrder } from '@/lib/billing/createPendingOrder'
import { takeRateLimit } from '@/lib/security/rateLimit'
import { createClient as createServerClient } from '@/lib/supabase/server'

/** 네이버페이 결제 전 pending 주문 생성 (confirm 시 소유권 검증) */
export async function POST(request: NextRequest) {
  try {
    const rate = takeRateLimit(request, 'api:billing:naver:ready', { windowMs: 60_000, max: 15 })
    if (!rate.ok) {
      return NextResponse.json({ error: '요청이 너무 많습니다.' }, { status: 429 })
    }

    if (!getNaverPayServerConfig().ready) {
      return NextResponse.json(
        { error: '네이버페이가 아직 활성화되지 않았습니다.' },
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
    const planNorm = normalizePlanId(String(body.plan ?? 'starter'))
    if (planNorm !== 'starter' && planNorm !== 'pro') {
      return NextResponse.json({ error: '유효하지 않은 플랜입니다.' }, { status: 400 })
    }

    const { orderId, amount, orderName } = await createPendingOrder({
      userId: user.id,
      planNorm,
      paymentProvider: 'naverpay',
    })

    return NextResponse.json({ ok: true, orderId, amount, plan: planNorm, orderName })
  } catch (err) {
    console.error('[billing/naver/ready]', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
