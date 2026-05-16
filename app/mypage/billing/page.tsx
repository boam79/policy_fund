'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CreditCard, Zap, Calendar, Receipt, Loader2, AlertCircle } from 'lucide-react'
import { getPlan, type PlanId } from '@/lib/billing/plans'
import { createClient } from '@/lib/supabase/client'

interface BillingData {
  subscription: { plan: PlanId; status: string; current_period_end?: string; cancel_at_period_end?: boolean }
  payments: { id: string; order_name: string; amount_krw: number; status: string; paid_at: string; order_id: string }[]
  usage: { eligibility_check: number; document_generate: number; evaluation: number }
}

const STATUS_LABEL: Record<string, string> = { done: '결제 완료', canceled: '취소', failed: '실패', pending: '처리중' }
const STATUS_COLOR: Record<string, string> = { done: 'text-green-600 bg-green-50', canceled: 'text-gray-500 bg-gray-100', failed: 'text-red-600 bg-red-50', pending: 'text-yellow-600 bg-yellow-50' }

export default function BillingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [data, setData] = useState<BillingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [canceling, setCanceling] = useState(false)
  const [cancelDone, setCancelDone] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login?next=/mypage/billing'); return }
      const res = await fetch('/api/billing/subscription')
      if (res.ok) setData(await res.json())
      setLoading(false)
    }
    load()
  }, [])

  const handleCancel = async () => {
    if (!confirm('정말 구독을 해지하시겠습니까? 현재 결제 기간이 끝난 뒤 Free 플랜으로 전환됩니다.')) return
    setCanceling(true)
    const res = await fetch('/api/billing/cancel', { method: 'POST' })
    if (res.ok) { setCancelDone(true); setData(d => d ? { ...d, subscription: { ...d.subscription, cancel_at_period_end: true } } : d) }
    setCanceling(false)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-blue-500" /></div>

  const sub = data?.subscription
  const currentPlan = getPlan(sub?.plan ?? 'free')
  const planLimits = currentPlan.limits

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto max-w-3xl px-4 py-8">
        {/* 브레드크럼 */}
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Link href="/mypage" className="hover:text-gray-600">마이페이지</Link>
          <span>›</span>
          <span className="text-gray-700">결제 관리</span>
        </div>

        {/* 현재 플랜 */}
        <div className="bg-white rounded-2xl border p-6 mb-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs text-gray-400 mb-1">현재 플랜</p>
              <h2 className="text-2xl font-black text-gray-900">{currentPlan.name}</h2>
              <p className="text-sm text-gray-500 mt-1">{currentPlan.priceLabel} · {currentPlan.description}</p>
              {sub?.current_period_end && (
                <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  다음 결제일: {new Date(sub.current_period_end).toLocaleDateString('ko-KR')}
                </p>
              )}
              {sub?.cancel_at_period_end && (
                <div className="flex items-center gap-1.5 mt-2 text-xs text-orange-600 bg-orange-50 px-3 py-1.5 rounded-lg w-fit">
                  <AlertCircle className="h-3.5 w-3.5" />
                  기간 만료 후 Free 플랜으로 전환 예정
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              {currentPlan.id !== 'pro' && (
                <Link href="/pricing" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors text-center">
                  플랜 업그레이드
                </Link>
              )}
              {currentPlan.id !== 'free' && !sub?.cancel_at_period_end && (
                <button onClick={handleCancel} disabled={canceling}
                  className="px-4 py-2 border border-gray-200 text-gray-500 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                  {canceling ? '처리 중...' : '구독 해지'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 이번 달 사용량 */}
        <div className="bg-white rounded-2xl border p-6 mb-4">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Zap className="h-4 w-4 text-blue-500" />이번 달 사용량
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <UsageBar
              label="자격판정"
              used={data?.usage.eligibility_check ?? 0}
              limit={planLimits.diagnoses_per_month}
            />
            <UsageBar
              label="문서 생성"
              used={data?.usage.document_generate ?? 0}
              limit={planLimits.documents_per_month}
            />
            <UsageBar
              label="심사 예측"
              used={data?.usage.evaluation ?? 0}
              limit={planLimits.evaluations_per_month}
            />
          </div>
          {currentPlan.id === 'free' && (
            <p className="text-xs text-gray-400 mt-3">
              사용량이 부족하신가요?{' '}
              <Link href="/pricing" className="text-blue-500 hover:underline">요금제에서 업그레이드</Link>해 보세요.
            </p>
          )}
        </div>

        {/* 결제 이력 */}
        <div className="bg-white rounded-2xl border overflow-hidden">
          <div className="flex items-center gap-2 p-5 border-b">
            <Receipt className="h-4 w-4 text-gray-400" />
            <h3 className="font-semibold text-gray-900">결제 이력</h3>
          </div>
          {(!data?.payments || data.payments.length === 0) ? (
            <div className="p-8 text-center text-gray-400">
              <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">결제 이력이 없습니다.</p>
            </div>
          ) : (
            data.payments.map(p => (
              <div key={p.id} className="flex items-center justify-between p-4 border-b last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">{p.order_name}</p>
                  <p className="text-xs text-gray-400">{p.paid_at ? new Date(p.paid_at).toLocaleDateString('ko-KR') : '-'} · {p.order_id}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLOR[p.status] ?? ''}`}>
                    {STATUS_LABEL[p.status] ?? p.status}
                  </span>
                  <span className="font-bold text-gray-900">{p.amount_krw.toLocaleString()}원</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  const effectiveLimit = limit === 0 ? null : limit
  const pct =
    effectiveLimit === null ? 0 : Math.min((used / effectiveLimit) * 100, 100)
  const limitLabel =
    limit === null ? '무제한' : limit === 0 ? '미포함' : `${limit}회`
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-gray-600">{label}</span>
        <span className="text-xs font-medium text-gray-900">
          {limit === 0 ? '—' : `${used} / ${limitLabel}`}
        </span>
      </div>
      {limit !== null && limit > 0 && (
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-orange-400' : 'bg-blue-500'}`}
            style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  )
}
