'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Check, X, Star } from 'lucide-react'
import { PLANS, type PlanId, normalizePlanId } from '@/lib/billing/plans'
import { createClient } from '@/lib/supabase/client'

const COLOR: Record<string, string> = {
  gray: 'border-gray-200',
  blue: 'border-blue-300',
  indigo: 'border-indigo-500 ring-2 ring-indigo-500',
}
const BTN_COLOR: Record<string, string> = {
  gray: 'bg-gray-800 hover:bg-gray-700',
  blue: 'bg-blue-600 hover:bg-blue-700',
  indigo: 'bg-indigo-600 hover:bg-indigo-700',
}
const BADGE_COLOR: Record<string, string> = {
  gray: 'bg-gray-100 text-gray-700',
  blue: 'bg-blue-100 text-blue-700',
  indigo: 'bg-indigo-100 text-indigo-700',
}

export default function PricingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [currentPlan, setCurrentPlan] = useState<PlanId | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setIsLoggedIn(true)
      const { data } = await supabase.from('subscriptions').select('plan_code, plan').eq('user_id', user.id).maybeSingle()
      setCurrentPlan(normalizePlanId(String(data?.plan_code ?? data?.plan ?? 'free')))
    })
  }, [])

  const handleSelect = (planId: PlanId) => {
    if (!isLoggedIn) {
      router.push(`/login?next=/pricing`)
      return
    }
    if (planId === 'free') return
    router.push(`/billing/checkout?plan=${planId}`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto max-w-5xl px-4 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-black text-gray-900 mb-3">요금제</h1>
          <p className="text-gray-500 max-w-xl mx-auto">
            정부지원사업 신청 성공률을 높이는 AI 분석·문서 생성 서비스.<br />
            필요에 맞는 플랜을 선택하세요.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLANS.map((plan) => {
            const isCurrent = currentPlan === plan.id || (!currentPlan && plan.id === 'free')
            return (
              <div
                key={plan.id}
                className={`relative bg-white rounded-2xl border p-6 flex flex-col ${COLOR[plan.color]} transition-shadow hover:shadow-md`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="flex items-center gap-1 text-xs font-bold text-white bg-indigo-600 px-3 py-1 rounded-full">
                      <Star className="h-3 w-3" /> 가장 인기
                    </span>
                  </div>
                )}

                <div className="mb-5">
                  <span className={`text-xs font-bold px-2 py-1 rounded-lg ${BADGE_COLOR[plan.color]}`}>{plan.name}</span>
                  <p className="text-2xl font-black text-gray-900 mt-3">{plan.priceLabel}</p>
                  <p className="text-xs text-gray-400 mt-1">{plan.price > 0 ? '부가세 포함' : ''}&nbsp;</p>
                  <p className="text-sm text-gray-500 mt-2 leading-snug">{plan.description}</p>
                </div>

                <ul className="space-y-2.5 mb-6 flex-1">
                  {plan.features.map((f) => (
                    <li key={f.label} className="flex items-center gap-2 text-sm">
                      {f.included ? (
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      ) : (
                        <X className="h-4 w-4 text-gray-300 flex-shrink-0" />
                      )}
                      <span className={f.included ? 'text-gray-700' : 'text-gray-300'}>{f.label}</span>
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <div className="w-full py-2.5 text-center text-sm font-medium bg-gray-100 text-gray-500 rounded-lg">현재 플랜</div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSelect(plan.id)}
                    className={`w-full py-2.5 text-sm font-medium text-white rounded-lg transition-colors ${BTN_COLOR[plan.color]}`}
                  >
                    {plan.id === 'free' ? '무료로 시작' : '선택하기'}
                  </button>
                )}
              </div>
            )
          })}
        </div>

        <div className="mt-12 max-w-2xl mx-auto">
          <h2 className="text-lg font-bold text-gray-900 mb-4 text-center">자주 묻는 질문</h2>
          <div className="space-y-3">
            {[
              ['구독은 언제든지 해지할 수 있나요?', '네, 언제든 마이페이지에서 해지 가능합니다. 해지 후에도 결제 기간 만료일까지 이용할 수 있습니다.'],
              ['Free 플랜에서 유료로 업그레이드하면 기존 데이터는 유지되나요?', '네, 이전에 생성한 문서와 검색 기록은 그대로 유지됩니다.'],
              ['세금계산서 발급이 되나요?', '법인 고객의 경우 고객센터를 통해 세금계산서 발급을 요청하실 수 있습니다.'],
              ['결제 수단은 무엇을 지원하나요?', '신용카드, 체크카드, 계좌이체(토스페이먼츠)를 지원합니다.'],
            ].map(([q, a], i) => (
              <details key={i} className="bg-white rounded-xl border p-4 group">
                <summary className="font-medium text-gray-900 cursor-pointer list-none flex items-center justify-between">
                  {q}
                  <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <p className="text-sm text-gray-500 mt-3 leading-relaxed">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
