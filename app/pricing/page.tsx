'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Check, X, Zap, Star } from 'lucide-react'
import { PLANS, type PlanId } from '@/lib/billing/plans'
import { createClient } from '@/lib/supabase/client'

const COLOR: Record<string, string> = {
  gray: 'border-gray-200',
  blue: 'border-blue-300',
  indigo: 'border-indigo-500 ring-2 ring-indigo-500',
  purple: 'border-purple-300',
}
const BTN_COLOR: Record<string, string> = {
  gray: 'bg-gray-800 hover:bg-gray-700',
  blue: 'bg-blue-600 hover:bg-blue-700',
  indigo: 'bg-indigo-600 hover:bg-indigo-700',
  purple: 'bg-purple-600 hover:bg-purple-700',
}
const BADGE_COLOR: Record<string, string> = {
  gray: 'bg-gray-100 text-gray-700',
  blue: 'bg-blue-100 text-blue-700',
  indigo: 'bg-indigo-100 text-indigo-700',
  purple: 'bg-purple-100 text-purple-700',
}

const PAY_ITEMS = [
  { name: '상세 자격판정 1건', price: '3,900원' },
  { name: '서류 체크리스트 1건', price: '4,900원' },
  { name: '사업계획서 초안 1건', price: '19,900원' },
  { name: '심사 점수 예측 1건', price: '9,900원' },
  { name: '계획서 + 점수예측 패키지', price: '29,900원' },
]

export default function PricingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [currentPlan, setCurrentPlan] = useState<PlanId | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [tab, setTab] = useState<'subscription' | 'payper'>('subscription')

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setIsLoggedIn(true)
      const { data } = await supabase.from('subscriptions').select('plan').eq('user_id', user.id).single()
      setCurrentPlan((data?.plan as PlanId) ?? 'free')
    })
  }, [])

  const handleSelect = (planId: PlanId) => {
    if (!isLoggedIn) { router.push(`/login?next=/pricing`); return }
    if (planId === 'free') return
    router.push(`/billing/checkout?plan=${planId}`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto max-w-6xl px-4 py-12">
        {/* 헤더 */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-black text-gray-900 mb-3">요금제</h1>
          <p className="text-gray-500 max-w-xl mx-auto">
            정부지원사업 신청 성공률을 높이는 AI 분석·문서 생성 서비스.<br />
            필요에 맞는 플랜을 선택하세요.
          </p>
        </div>

        {/* 탭 */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex gap-1 bg-white border rounded-xl p-1">
            <button onClick={() => setTab('subscription')}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'subscription' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
              구독 플랜
            </button>
            <button onClick={() => setTab('payper')}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'payper' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
              건당 결제
            </button>
          </div>
        </div>

        {/* 구독 플랜 */}
        {tab === 'subscription' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {PLANS.map(plan => {
                const isCurrent = currentPlan === plan.id || (!currentPlan && plan.id === 'free')
                return (
                  <div key={plan.id}
                    className={`relative bg-white rounded-2xl border p-6 flex flex-col ${COLOR[plan.color]} transition-shadow hover:shadow-md`}>
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
                      {plan.features.map(f => (
                        <li key={f.label} className="flex items-center gap-2 text-sm">
                          {f.included
                            ? <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                            : <X className="h-4 w-4 text-gray-300 flex-shrink-0" />}
                          <span className={f.included ? 'text-gray-700' : 'text-gray-300'}>{f.label}</span>
                        </li>
                      ))}
                    </ul>

                    {isCurrent ? (
                      <div className="w-full py-2.5 text-center text-sm font-medium bg-gray-100 text-gray-500 rounded-lg">
                        현재 플랜
                      </div>
                    ) : (
                      <button onClick={() => handleSelect(plan.id)}
                        className={`w-full py-2.5 text-sm font-medium text-white rounded-lg transition-colors ${BTN_COLOR[plan.color]}`}>
                        {plan.id === 'free' ? '무료로 시작' : '선택하기'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            {/* B2B 안내 */}
            <div className="mt-8 bg-gradient-to-r from-gray-900 to-gray-700 rounded-2xl p-6 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="h-4 w-4 text-yellow-400" />
                  <span className="font-bold text-sm">컨설턴트·기관을 위한 B2B 플랜</span>
                </div>
                <p className="text-sm text-gray-300">고객사 최대 500명·브랜드 리포트·팀원 계정 관리까지. 월 49,000원부터.</p>
              </div>
              <Link href="/contact?type=b2b" className="flex-shrink-0 px-5 py-2.5 bg-white text-gray-900 rounded-lg text-sm font-bold hover:bg-gray-100 transition-colors">
                도입 문의하기
              </Link>
            </div>
          </>
        )}

        {/* 건당 결제 */}
        {tab === 'payper' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl border overflow-hidden">
              <div className="p-5 bg-gray-50 border-b">
                <p className="text-sm text-gray-500">구독 없이 필요한 항목만 개별 결제할 수 있습니다.</p>
              </div>
              {PAY_ITEMS.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-5 border-b last:border-0">
                  <div>
                    <p className="font-medium text-gray-900">{item.name}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-gray-900">{item.price}</span>
                    <button onClick={() => router.push(isLoggedIn ? `/billing/checkout?item=${encodeURIComponent(item.name)}&price=${item.price.replace(/[^0-9]/g,'')}` : '/login?next=/pricing')}
                      className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-700 transition-colors">
                      구매
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 text-center mt-4">건당 결제 금액은 부가세 포함입니다. 결제 후 사용 기간 제한 없이 이용 가능합니다.</p>
          </div>
        )}

        {/* 하단 FAQ */}
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
