import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { getNaverPayServerConfig } from '@/lib/billing/naverpay'
import { secretsEqual } from '@/lib/security/secrets'

/**
 * 네이버페이 취소·환불 알림(가맹점 설정) 수신.
 * Body 예: { event: "CANCEL", paymentId, merchantPayKey }
 */
export async function POST(request: NextRequest) {
  try {
    const cfg = getNaverPayServerConfig()
    if (!cfg.ready) {
      return NextResponse.json({ received: false, message: 'PG 비활성화 상태' }, { status: 503 })
    }

    const webhookSecret = process.env.NAVER_PAY_WEBHOOK_SECRET?.trim()
    if (!webhookSecret) {
      return NextResponse.json(
        { received: false, message: '웹훅 비밀키 미설정' },
        { status: 503 }
      )
    }

    const receivedSecret = request.headers.get('x-naverpay-webhook-secret')
    if (!secretsEqual(receivedSecret, webhookSecret)) {
      return NextResponse.json({ received: false, message: '웹훅 인증 실패' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const event = typeof body.event === 'string' ? body.event : ''
    const merchantPayKey =
      typeof body.merchantPayKey === 'string' ? body.merchantPayKey.trim() : ''

    if (event !== 'CANCEL' && event !== 'PAYMENT_CANCELED') {
      return NextResponse.json({ received: true, ignored: true })
    }

    if (!merchantPayKey) {
      return NextResponse.json({ received: false, message: 'merchantPayKey 누락' }, { status: 400 })
    }

    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    await supabase.from('payments').update({ status: 'canceled' }).eq('order_id', merchantPayKey)

    const { data: payment } = await supabase
      .from('payments')
      .select('user_id')
      .eq('order_id', merchantPayKey)
      .single()

    if (payment?.user_id) {
      await supabase
        .from('subscriptions')
        .update({ status: 'canceled', cancel_at_period_end: true })
        .eq('user_id', payment.user_id)
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('[billing/webhook]', err)
    return NextResponse.json({ error: 'webhook error' }, { status: 500 })
  }
}
