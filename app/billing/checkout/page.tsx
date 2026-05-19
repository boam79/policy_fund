'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Script from 'next/script'
import { createClient } from '@/lib/supabase/client'
import { PLANS, normalizePlanId, type PlanId } from '@/lib/billing/plans'
import { Shield, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { SITE_NAME } from '@/lib/site-config'
import PaymentMethodButtons from '@/components/billing/PaymentMethodButtons'
import { usePaymentConfirm } from '@/hooks/usePaymentConfirm'

const NAVER_SDK = 'https://nsp.pay.naver.com/sdk/js/naverpay.min.js'

function CheckoutForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const rawPlan = searchParams.get('plan') ?? 'starter'
  let planId: PlanId = normalizePlanId(rawPlan)
  if (planId === 'free') planId = 'starter'
  const plan = PLANS.find((p) => p.id === planId) ?? PLANS[1]

  const [userId, setUserId] = useState('')
  const [sdkReady, setSdkReady] = useState(false)

  const pgFlag = process.env.NEXT_PUBLIC_PAYMENT_PG_ENABLED === 'true'
  const naverClientId = process.env.NEXT_PUBLIC_NAVER_PAY_CLIENT_ID?.trim() ?? ''
  const naverChainId = process.env.NEXT_PUBLIC_NAVER_PAY_CHAIN_ID?.trim() ?? ''
  const naverMode =
    process.env.NEXT_PUBLIC_NAVER_PAY_MODE === 'production' ? 'production' : 'development'
  const naverEnabled = pgFlag && Boolean(naverClientId && naverChainId)
  const kakaoEnabled = pgFlag && Boolean(process.env.NEXT_PUBLIC_KAKAO_PAY_CID?.trim())
  const anyPgEnabled = naverEnabled || kakaoEnabled

  const { loading, error, setError, handleNaverPayment, handleKakaoPayment } = usePaymentConfirm(
    planId,
    plan.name,
    plan.price
  )

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/login?next=/support')
        return
      }
      setUserId(user.id)
    })
  }, [router])

  if (!plan) return null

  return (
    <>
      {naverEnabled && (
        <Script
          src={NAVER_SDK}
          strategy="afterInteractive"
          onLoad={() => setSdkReady(true)}
          onError={() => setError('네이버페이 SDK 로드에 실패했습니다.')}
        />
      )}

      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <Link
            href="/support"
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            후원·안내로 돌아가기
          </Link>

          <div className="bg-white rounded-2xl border p-6 shadow-sm">
            <h1 className="text-xl font-bold text-gray-900 mb-5">결제 확인</h1>

            <div className="bg-gray-50 rounded-xl p-4 mb-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">플랜</span>
                <span className="font-bold text-gray-900">
                  {SITE_NAME} {plan.name}
                </span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">결제 주기</span>
                <span className="text-sm text-gray-700">월 정기결제</span>
              </div>
              <div className="flex items-center justify-between border-t pt-2 mt-2">
                <span className="text-sm font-medium text-gray-700">결제 금액</span>
                <span className="text-xl font-black text-gray-900">{plan.price.toLocaleString()}원</span>
              </div>
              <p className="text-xs text-gray-400 text-right mt-1">부가세 포함</p>
            </div>

            <div className="space-y-2 mb-5">
              <p className="text-xs font-medium text-gray-500 mb-2">플랜 혜택</p>
              {plan.features
                .filter((f) => f.included)
                .map((f) => (
                  <div key={f.label} className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="text-green-500">✓</span>
                    {f.label}
                  </div>
                ))}
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">{error}</p>
            )}
            {!anyPgEnabled && (
              <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mb-4">
                현재는 결제 기능 점검 단계로, 실제 결제는 비활성화되어 있습니다.
              </p>
            )}

            <PaymentMethodButtons
              planPrice={plan.price}
              loading={loading}
              userId={userId}
              naverEnabled={naverEnabled}
              kakaoEnabled={kakaoEnabled}
              sdkReady={sdkReady}
              onNaver={() =>
                void handleNaverPayment(userId, {
                  clientId: naverClientId,
                  chainId: naverChainId,
                  mode: naverMode,
                })
              }
              onKakao={() => void handleKakaoPayment()}
            />

            <div className="flex items-center justify-center gap-1.5 mt-3">
              <Shield className="h-3.5 w-3.5 text-gray-400" />
              <p className="text-xs text-gray-400">안전 결제 · 언제든지 해지 가능</p>
            </div>
          </div>

          <p className="text-xs text-gray-400 text-center mt-4">
            결제 시 <Link href="/terms" className="underline">이용약관</Link> 및{' '}
            <Link href="/privacy" className="underline">개인정보처리방침</Link>에 동의합니다.
          </p>
        </div>
      </div>
    </>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense>
      <CheckoutForm />
    </Suspense>
  )
}
