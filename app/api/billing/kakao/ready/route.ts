import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { getPlan, normalizePlanId } from '@/lib/billing/plans'
import { SITE_NAME } from '@/lib/site-config'
import { getKakaoPayServerConfig, kakaoPaymentReady, pickKakaoRedirectUrl } from '@/lib/billing/kakaopay'
import { takeRateLimit } from '@/lib/security/rateLimit'
import { createClient as createServerClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const rate = takeRateLimit(request, 'api:billing:kakao:ready', { windowMs: 60_000, max: 15 })
    if (!rate.ok) {
      return NextResponse.json({ error: '요청이 너무 많습니다.' }, { status: 429 })
    }

    const cfg = getKakaoPayServerConfig()
    if (!cfg.ready) {
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
    const planNorm = normalizePlanId(String(body.plan ?? 'starter'))
    if (planNorm !== 'starter' && planNorm !== 'pro') {
      return NextResponse.json({ error: '유효하지 않은 플랜입니다.' }, { status: 400 })
    }

    const plan = getPlan(planNorm)
    const orderId = `JW-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
    const itemName = `${SITE_NAME} ${plan.name} 월 구독`
    const origin = request.nextUrl.origin

    const approvalUrl = `${origin}/billing/kakao/success?plan=${planNorm}&orderId=${encodeURIComponent(orderId)}&amount=${plan.price}`
    const cancelUrl = `${origin}/billing/fail?message=${encodeURIComponent('결제가 취소되었습니다.')}`
    const failUrl = `${origin}/billing/fail?message=${encodeURIComponent('결제에 실패했습니다.')}`

    const { ok, data } = await kakaoPaymentReady({
      partner_order_id: orderId,
      partner_user_id: user.id,
      item_name: itemName,
      total_amount: plan.price,
      approval_url: approvalUrl,
      cancel_url: cancelUrl,
      fail_url: failUrl,
    })

    if (!ok || !data.tid) {
      console.warn('[billing/kakao/ready] failed', data)
      return NextResponse.json(
        { error: data.error_message ?? '카카오페이 결제 준비에 실패했습니다.' },
        { status: 400 }
      )
    }

    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { error: insertError } = await supabase.from('payments').insert({
      user_id: user.id,
      order_id: orderId,
      order_name: itemName,
      amount_krw: plan.price,
      status: 'pending',
      payment_provider: 'kakaopay',
      provider_payment_id: data.tid,
      metadata: { plan: planNorm, tid: data.tid },
    })

    if (insertError) {
      console.error('[billing/kakao/ready] insert', insertError)
      return NextResponse.json({ error: '주문 정보 저장에 실패했습니다.' }, { status: 500 })
    }

    const redirectUrl = pickKakaoRedirectUrl(data, request.headers.get('user-agent'))
    if (!redirectUrl) {
      return NextResponse.json({ error: '결제 페이지 URL을 받지 못했습니다.' }, { status: 502 })
    }

    return NextResponse.json({ ok: true, redirectUrl, orderId })
  } catch (err) {
    console.error('[billing/kakao/ready]', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
