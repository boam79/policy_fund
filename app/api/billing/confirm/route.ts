import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import type { PlanId } from '@/lib/billing/plans'
import { createClient as createServerClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const pgEnabled = process.env.PAYMENT_PG_ENABLED === 'true'
    if (!pgEnabled || !process.env.TOSS_SECRET_KEY) {
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

    const { paymentKey, orderId, amount, plan } = await request.json()

    if (!paymentKey || !orderId || !amount || !plan) {
      return NextResponse.json({ error: '필수 파라미터 누락' }, { status: 400 })
    }
    if (!['starter', 'pro', 'premium'].includes(String(plan))) {
      return NextResponse.json({ error: '유효하지 않은 플랜입니다.' }, { status: 400 })
    }

    // 1. 토스페이먼츠 서버 확인
    const tossRes = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${process.env.TOSS_SECRET_KEY}:`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paymentKey, orderId, amount }),
    })

    if (!tossRes.ok) {
      const err = await tossRes.json()
      return NextResponse.json({ error: err.message ?? '결제 확인 실패' }, { status: 400 })
    }

    const payment = await tossRes.json()

    // 2. Supabase에 결제 및 구독 정보 저장
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const now = new Date()
    const periodEnd = new Date(now)
    periodEnd.setMonth(periodEnd.getMonth() + 1)

    // payments 저장
    const { data: paymentRecord } = await supabase.from('payments').insert({
      user_id: user.id,
      amount_krw: amount,
      status: 'done',
      payment_provider: 'toss',
      provider_payment_id: paymentKey,
      order_id: orderId,
      order_name: payment.orderName,
      paid_at: new Date().toISOString(),
    }).select('id').single()

    // subscriptions upsert
    await supabase.from('subscriptions').upsert({
      user_id: user.id,
      plan_code: plan as PlanId,
      status: 'active',
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      payment_provider: 'toss',
      updated_at: now.toISOString(),
    }, { onConflict: 'user_id' })

    // payments에 subscription_id 연결
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
