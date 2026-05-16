'use client'
import { useCallback, useEffect, useState } from 'react'
import {
  Loader2,
  CreditCard,
  TrendingUp,
  RefreshCw,
  Users,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  Ban,
} from 'lucide-react'
import type { Database } from '@/types/database.types'
import { readApiError } from '@/lib/api/readApiError'
import { getPlan, normalizePlanId, type PlanId } from '@/lib/billing/plans'

type Payment = Database['public']['Tables']['payments']['Row']
type Subscription = Database['public']['Tables']['subscriptions']['Row']

const STATUS_COLOR: Record<string, string> = {
  done: 'text-green-400 bg-green-900/30',
  canceled: 'text-gray-400 bg-gray-700',
  failed: 'text-red-400 bg-red-900/30',
  pending: 'text-yellow-400 bg-yellow-900/30',
}
const STATUS_LABEL: Record<string, string> = {
  done: '완료',
  canceled: '취소',
  failed: '실패',
  pending: '처리중',
}

function shortId(id: string | null | undefined, len = 8) {
  if (!id) return '—'
  return id.length <= len ? id : `${id.slice(0, len)}…`
}

export default function AdminBillingPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [planBreakdown, setPlanBreakdown] = useState<Record<PlanId, number>>({
    free: 0,
    starter: 0,
    pro: 0,
  })
  const [stats, setStats] = useState({
    total: 0,
    done: 0,
    pending: 0,
    failed: 0,
    canceled: 0,
    amount: 0,
    filteredAmount: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [q, setQ] = useState('')
  const [qInput, setQInput] = useState('')

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (q.trim()) params.set('q', q.trim())
      params.set('limit', '200')
      const res = await fetch(`/api/admin/billing?${params.toString()}`)
      const json = await res.json()
      if (!res.ok) {
        throw new Error(readApiError(json, '결제 데이터를 불러오지 못했습니다.'))
      }

      setPayments((json.payments ?? []) as Payment[])
      setSubscriptions((json.subscriptions ?? []) as Subscription[])
      setPlanBreakdown(
        (json.planBreakdown as Record<PlanId, number>) ?? { free: 0, starter: 0, pro: 0 }
      )
      setStats(
        json.stats ?? {
          total: 0,
          done: 0,
          pending: 0,
          failed: 0,
          canceled: 0,
          amount: 0,
          filteredAmount: 0,
        }
      )
    } catch (err) {
      setPayments([])
      setSubscriptions([])
      setPlanBreakdown({ free: 0, starter: 0, pro: 0 })
      setStats({ total: 0, done: 0, pending: 0, failed: 0, canceled: 0, amount: 0, filteredAmount: 0 })
      setError(err instanceof Error ? err.message : '결제 데이터를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, q])

  useEffect(() => {
    void load()
  }, [load])

  const applySearch = () => {
    setQ(qInput)
  }

  if (loading && payments.length === 0 && !error) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-blue-400" />
          결제 관리
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-800"
          >
            <option value="all">전체 상태</option>
            <option value="done">완료</option>
            <option value="pending">처리중</option>
            <option value="failed">실패</option>
            <option value="canceled">취소</option>
          </select>
          <input
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applySearch()}
            placeholder="주문번호·상품명 검색"
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 w-48 min-w-[8rem] bg-white text-gray-800"
          />
          <button
            type="button"
            onClick={() => applySearch()}
            className="text-sm px-3 py-2 rounded-lg bg-gray-800 text-white hover:bg-gray-700"
          >
            검색
          </button>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            새로고침
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
        {[
          { label: '전체 건수', value: `${stats.total}건`, icon: CreditCard },
          { label: '결제 완료', value: `${stats.done}건`, icon: CheckCircle2, tone: 'text-green-600' },
          { label: '처리중', value: `${stats.pending}건`, icon: Clock, tone: 'text-amber-600' },
          { label: '실패', value: `${stats.failed}건`, icon: XCircle, tone: 'text-red-600' },
          { label: '취소', value: `${stats.canceled}건`, icon: Ban, tone: 'text-gray-600' },
          { label: '완료 결제액(전체)', value: `${stats.amount.toLocaleString()}원`, icon: TrendingUp },
        ].map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="bg-gray-800 rounded-xl p-3 border border-gray-700">
            <p className="text-[11px] text-gray-400 mb-1 flex items-center gap-1">
              <Icon className={`h-3.5 w-3.5 ${tone ?? ''}`} />
              {label}
            </p>
            <p className="text-lg font-bold text-white">{value}</p>
          </div>
        ))}
      </div>

      {(statusFilter !== 'all' || q) && (
        <p className="text-xs text-gray-500 mb-4">
          아래 표는 필터 적용 건수 기준입니다. 완료 결제액(필터){' '}
          <span className="font-semibold text-gray-800">{stats.filteredAmount.toLocaleString()}원</span>
        </p>
      )}

      <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 mb-6">
        <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Users className="h-4 w-4 text-cyan-400" />
          구독 플랜 분포 (최근 갱신 구독 행 기준)
        </h2>
        <div className="flex flex-wrap gap-2">
          {(['free', 'starter', 'pro'] as PlanId[]).map((pid) => (
            <span
              key={pid}
              className="text-xs px-3 py-1.5 rounded-full bg-gray-900 text-gray-200 border border-gray-700"
            >
              {getPlan(pid).name}: {planBreakdown[pid] ?? 0}건
            </span>
          ))}
        </div>
      </div>

      <h2 className="text-sm font-semibold text-gray-800 mb-2">구독 현황</h2>
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-x-auto mb-8">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700">
              {['사용자', '플랜', '상태', '다음 결제·종료', '해지 예약', '갱신일', '결제 수단'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs text-gray-400 font-medium whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {subscriptions.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-gray-500">
                  구독 데이터가 없습니다
                </td>
              </tr>
            ) : (
              subscriptions.map((s) => {
                const pid = normalizePlanId(String(s.plan_code ?? s.plan ?? 'free'))
                const plan = getPlan(pid)
                return (
                  <tr key={s.id} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-2.5 text-xs font-mono text-gray-300" title={s.user_id ?? ''}>
                      {shortId(s.user_id, 10)}
                    </td>
                    <td className="px-4 py-2.5 text-gray-200">{plan.name}</td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-900 text-gray-300">{s.status}</span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-400 whitespace-nowrap">
                      {s.current_period_end
                        ? new Date(s.current_period_end).toLocaleString('ko-KR', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })
                        : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-xs">
                      {s.cancel_at_period_end ? (
                        <span className="text-orange-300">예정</span>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">
                      {s.updated_at ? new Date(s.updated_at).toLocaleDateString('ko-KR') : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-400">{s.payment_provider ?? '—'}</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <h2 className="text-sm font-semibold text-gray-800 mb-2">결제 이력</h2>
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700">
              {['주문번호', '사용자', '상품', '금액', '상태', '결제일', '환불일', '제공자'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs text-gray-400 font-medium whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-gray-500">
                  결제 이력이 없습니다
                </td>
              </tr>
            ) : (
              payments.map((p) => (
                <tr key={p.id} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                  <td className="px-4 py-3 text-xs text-gray-400 font-mono whitespace-nowrap">{p.order_id ?? '—'}</td>
                  <td className="px-4 py-3 text-xs font-mono text-gray-500" title={p.user_id ?? ''}>
                    {shortId(p.user_id, 10)}
                  </td>
                  <td className="px-4 py-3 text-gray-200 max-w-[200px] truncate" title={p.order_name ?? ''}>
                    {p.order_name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-white font-medium whitespace-nowrap">
                    {(p.amount_krw ?? 0).toLocaleString()}원
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLOR[p.status] ?? ''}`}
                    >
                      {STATUS_LABEL[p.status] ?? p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                    {p.paid_at ? new Date(p.paid_at).toLocaleString('ko-KR') : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {p.refunded_at ? new Date(p.refunded_at).toLocaleDateString('ko-KR') : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">{p.payment_provider ?? '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
