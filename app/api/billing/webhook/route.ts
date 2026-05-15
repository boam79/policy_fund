import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

export async function POST(request: NextRequest) {
  try {
    const pgEnabled = process.env.PAYMENT_PG_ENABLED === 'true'
    if (!pgEnabled || !process.env.TOSS_SECRET_KEY) {
      return NextResponse.json(
        { received: false, message: 'PG 비활성화 상태' },
        { status: 503 }
      )
    }

    const body = await request.json()
    const { eventType, data } = body

    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 결제 취소·환불 처리
    if (eventType === 'PAYMENT_STATUS_CHANGED') {
      const { orderId, status } = data
      if (status === 'CANCELED') {
        await supabase.from('payments').update({ status: 'canceled' }).eq('order_id', orderId)
        // 구독도 취소
        const { data: payment } = await supabase.from('payments').select('user_id').eq('order_id', orderId).single()
        if (payment?.user_id) {
          await supabase.from('subscriptions').update({ status: 'canceled', cancel_at_period_end: true }).eq('user_id', payment.user_id)
        }
      }
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('[billing/webhook]', err)
    return NextResponse.json({ error: 'webhook error' }, { status: 500 })
  }
}
