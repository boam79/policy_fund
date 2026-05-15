'use client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PLANS, type PlanId } from '@/lib/billing/plans'
import { Loader2, CreditCard, Shield, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

function CheckoutForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const planId = (searchParams.get('plan') ?? 'starter') as PlanId
  const plan = PLANS.find(p => p.id === planId) ?? PLANS[1]

  const [loading, setLoading] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [userId, setUserId] = useState('')
  const [error, setError] = useState('')
  const pgEnabled =
    process.env.NEXT_PUBLIC_PAYMENT_PG_ENABLED === 'true' &&
    Boolean(process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login?next=/pricing'); return }
      setUserEmail(user.email ?? '')
      setUserId(user.id)
    })
  }, [])

  const handlePayment = async () => {
    if (!userId) return
    if (!pgEnabled) {
      setError('현재 결제 PG 연동 준비 중입니다. 운영자에게 활성화 일정을 문의해주세요.')
      return
    }
    setLoading(true)
    setError('')

    try {
      // 주문 ID 생성
      const orderId = `PF-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
      const orderName = `PolicyFund AI ${plan.name} 월 구독`

      // Toss Payments SDK v2 동적 로드
      const { loadTossPayments } = await import('@tosspayments/tosspayments-sdk')
      const tossPayments = await loadTossPayments(process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ?? 'test_ck_placeholder')
      const payment = tossPayments.payment({ customerKey: userId })

      await payment.requestPayment({
        method: 'CARD',
        amount: { currency: 'KRW', value: plan.price },
        orderId,
        orderName,
        customerEmail: userEmail,
        successUrl: `${window.location.origin}/billing/success?orderId=${orderId}&plan=${planId}`,
        failUrl: `${window.location.origin}/billing/fail`,
      })
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      if (!errMsg.includes('PAY_PROCESS_CANCELED')) {
        setError('결제 처리 중 오류가 발생했습니다. 다시 시도해주세요.')
      }
      setLoading(false)
    }
  }

  if (!plan) return null

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link href="/pricing" className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 mb-6">
          <ArrowLeft className="h-4 w-4" />요금제로 돌아가기
        </Link>

        <div className="bg-white rounded-2xl border p-6 shadow-sm">
          <h1 className="text-xl font-bold text-gray-900 mb-5">결제 확인</h1>

          <div className="bg-gray-50 rounded-xl p-4 mb-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">플랜</span>
              <span className="font-bold text-gray-900">PolicyFund AI {plan.name}</span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">결제 주기</span>
              <span className="text-sm text-gray-700">월 정기결제</span>
            </div>
            <div className="flex items-center justify-between border-t pt-2 mt-2">
              <span className="text-sm font-medium text-gray-700">결제 금액</span>
              <span className="text-xl font-black text-gray-900">
                {plan.price.toLocaleString()}원
              </span>
            </div>
            <p className="text-xs text-gray-400 text-right mt-1">부가세 포함</p>
          </div>

          <div className="space-y-2 mb-5">
            <p className="text-xs font-medium text-gray-500 mb-2">플랜 혜택</p>
            {plan.features.filter(f => f.included).map(f => (
              <div key={f.label} className="flex items-center gap-2 text-sm text-gray-700">
                <span className="text-green-500">✓</span>{f.label}
              </div>
            ))}
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">{error}</p>}
          {!pgEnabled && (
            <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mb-4">
              현재는 결제 기능 점검 단계로, 실제 카드 결제는 비활성화되어 있습니다.
            </p>
          )}

          <button onClick={handlePayment} disabled={loading || !userId}
            className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
            {loading ? '결제 처리 중...' : pgEnabled ? `${plan.price.toLocaleString()}원 결제하기` : 'PG 연동 준비중'}
          </button>

          <div className="flex items-center justify-center gap-1.5 mt-3">
            <Shield className="h-3.5 w-3.5 text-gray-400" />
            <p className="text-xs text-gray-400">토스페이먼츠 보안 결제. 언제든지 해지 가능.</p>
          </div>
        </div>

        <p className="text-xs text-gray-400 text-center mt-4">
          결제 시 <Link href="/terms" className="underline">이용약관</Link>과{' '}
          <Link href="/refund-policy" className="underline">환불정책</Link>에 동의합니다.
        </p>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return <Suspense><CheckoutForm /></Suspense>
}
