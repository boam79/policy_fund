import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { getPlan, normalizePlanId } from '@/lib/billing/plans'
import { getNaverPayServerConfig } from '@/lib/billing/naverpay'
import { SITE_NAME } from '@/lib/site-config'
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

    const plan = getPlan(planNorm)
    const orderId = `JW-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
    const orderName = `${SITE_NAME} ${plan.name} 월 구독`

    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { error: insertError } = await supabase.from('payments').insert({
      user_id: user.id,
      order_id: orderId,
      order_name: orderName,
      amount_krw: plan.price,
      status: 'pending',
      payment_provider: 'naverpay',
      metadata: { plan: planNorm },
    })

    if (insertError) {
      console.error('[billing/naver/ready] insert', insertError)
      return NextResponse.json({ error: '주문 정보 저장에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, orderId, amount: plan.price, plan: planNorm })
  } catch (err) {
    console.error('[billing/naver/ready]', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
