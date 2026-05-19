import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import type { PlanId } from '@/lib/billing/plans'

export type PaymentProvider = 'naverpay' | 'kakaopay'

export function generateOrderId(): string {
  return `JW-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
}

export async function finalizeSubscription(input: {
  supabase: SupabaseClient<Database>
  userId: string
  pendingPaymentId: string
  planNorm: PlanId
  amountNum: number
  orderName: string
  paymentProvider: PaymentProvider
  providerPaymentId: string
  metadata?: Database['public']['Tables']['payments']['Row']['metadata']
}): Promise<void> {
  const now = new Date()
  const periodEnd = new Date(now)
  periodEnd.setMonth(periodEnd.getMonth() + 1)

  await input.supabase
    .from('payments')
    .update({
      status: 'done',
      amount_krw: input.amountNum,
      order_name: input.orderName,
      provider_payment_id: input.providerPaymentId,
      paid_at: now.toISOString(),
      metadata: input.metadata ?? { plan: input.planNorm },
    })
    .eq('id', input.pendingPaymentId)

  await input.supabase.from('subscriptions').upsert(
    {
      user_id: input.userId,
      plan_code: input.planNorm,
      status: 'active',
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      payment_provider: input.paymentProvider,
      updated_at: now.toISOString(),
    },
    { onConflict: 'user_id' }
  )

  const { data: sub } = await input.supabase
    .from('subscriptions')
    .select('id')
    .eq('user_id', input.userId)
    .single()
  if (sub) {
    await input.supabase
      .from('payments')
      .update({ subscription_id: sub.id })
      .eq('id', input.pendingPaymentId)
  }
}
