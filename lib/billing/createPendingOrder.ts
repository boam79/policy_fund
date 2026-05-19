import { getPlan, type PlanId } from '@/lib/billing/plans'
import { SITE_NAME } from '@/lib/site-config'
import { requireServiceRoleClient } from '@/lib/supabase/serviceRole'
import { generateOrderId, type PaymentProvider } from '@/lib/billing/finalizeSubscription'

export async function createPendingOrder(input: {
  userId: string
  planNorm: PlanId
  paymentProvider: PaymentProvider
  providerPaymentId?: string
  orderName?: string
}): Promise<{ orderId: string; amount: number; orderName: string }> {
  const plan = getPlan(input.planNorm)
  const orderId = generateOrderId()
  const orderName = input.orderName ?? `${SITE_NAME} ${plan.name} 월 구독`
  const supabase = requireServiceRoleClient()

  const { error: insertError } = await supabase.from('payments').insert({
    user_id: input.userId,
    order_id: orderId,
    order_name: orderName,
    amount_krw: plan.price,
    status: 'pending',
    payment_provider: input.paymentProvider,
    provider_payment_id: input.providerPaymentId ?? null,
    metadata: { plan: input.planNorm },
  })

  if (insertError) {
    throw new Error('PENDING_ORDER_INSERT_FAILED')
  }

  return { orderId, amount: plan.price, orderName }
}
