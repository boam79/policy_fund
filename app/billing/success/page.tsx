'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { PLANS, normalizePlanId, type PlanId } from '@/lib/billing/plans'
import { SITE_NAME } from '@/lib/site-config'

function SuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const paymentKey = searchParams.get('paymentKey')
  const orderId = searchParams.get('orderId')
  const amount = searchParams.get('amount')
  const rawPlan = searchParams.get('plan') ?? 'starter'
  let planId: PlanId = normalizePlanId(rawPlan)
  if (planId === 'free') planId = 'starter'
  const plan = PLANS.find(p => p.id === planId)

  const [status, setStatus] = useState<'processing' | 'done' | 'error'>('processing')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const confirm = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const res = await fetch('/api/billing/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentKey, orderId, amount: Number(amount), plan: planId, userId: user.id }),
      })

      if (res.ok) { setStatus('done') }
      else {
        const err = await res.json()
        setErrorMsg(err.error ?? '처리 실패')
        setStatus('error')
      }
    }
    if (paymentKey && orderId && amount) confirm()
  }, [paymentKey, orderId, amount, planId, router])

  if (status === 'processing') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">결제를 확인하고 있습니다...</p>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-sm">
          <p className="text-red-600 font-medium mb-2">결제 처리 중 오류가 발생했습니다</p>
          <p className="text-sm text-gray-500 mb-4">{errorMsg}</p>
          <Link href="/pricing" className="text-blue-600 hover:underline text-sm">요금제 페이지로 돌아가기</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border p-10 text-center max-w-md shadow-sm">
        <CheckCircle className="h-14 w-14 text-green-500 mx-auto mb-4" />
        <h1 className="text-2xl font-black text-gray-900 mb-2">결제 완료!</h1>
        <p className="text-gray-500 mb-1">{SITE_NAME} <strong>{plan?.name}</strong> 플랜이 활성화되었습니다.</p>
        <p className="text-sm text-gray-400 mb-6">주문번호: {orderId}</p>
        <div className="flex flex-col gap-2">
          <Link href="/mypage" className="py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors">
            마이페이지 바로가기
          </Link>
          <Link href="/" className="py-3 text-gray-500 hover:text-gray-700 text-sm">
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function SuccessPage() {
  return <Suspense><SuccessContent /></Suspense>
}
