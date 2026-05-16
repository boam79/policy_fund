'use client'
import { useCallback, useEffect, useState } from 'react'
import { Loader2, Users, Crown, RefreshCw, ChevronLeft, ChevronRight, Search, AlertCircle } from 'lucide-react'
import { readApiError } from '@/lib/api/readApiError'
import { getPlan, type PlanId } from '@/lib/billing/plans'

interface UserRow {
  id: string
  email: string
  created_at: string
  plan: PlanId
  subscription_status: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean | null
  last_sign_in_at: string | null
  usage: { eligibility_check: number; document_generate: number; evaluation: number }
}

const PLAN_COLOR: Record<string, string> = {
  free: 'text-gray-400 bg-gray-700',
  starter: 'text-blue-400 bg-blue-900/40',
  pro: 'text-indigo-400 bg-indigo-900/40',
}

const SUB_STATUS_LABEL: Record<string, string> = {
  active: '활성',
  trialing: '체험',
  canceled: '해지됨',
  past_due: '연체',
  unpaid: '미납',
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [q, setQ] = useState('')
  const [qInput, setQInput] = useState('')
  const [scannedPages, setScannedPages] = useState(0)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('perPage', '40')
      if (q.trim()) params.set('q', q.trim())
      const res = await fetch(`/api/admin/users?${params.toString()}`)
      const json = await res.json()
      if (!res.ok) {
        throw new Error(readApiError(json, '회원 데이터를 불러오지 못했습니다.'))
      }
      setUsers(json.users ?? [])
      setHasMore(Boolean(json.hasMore))
      setScannedPages(Number(json.scannedAuthPages) || 0)
    } catch (err) {
      setUsers([])
      setHasMore(false)
      setError(err instanceof Error ? err.message : '회원 데이터를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [page, q])

  useEffect(() => {
    void load()
  }, [load])

  const runSearch = () => {
    setPage(1)
    setQ(qInput.trim())
  }

  const clearSearch = () => {
    setQInput('')
    setQ('')
    setPage(1)
  }

  return (
    <div className="p-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Users className="h-5 w-5 text-cyan-400" />
          회원 관리
          {!q && (
            <span className="text-sm font-normal text-gray-500 ml-1">
              페이지 {page}
              {hasMore ? ' · 다음 페이지 있음' : ''}
            </span>
          )}
          {q && (
            <span className="text-sm font-normal text-amber-700 ml-1">
              검색 결과 {users.length}명 (스캔 {scannedPages}페이지)
            </span>
          )}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 border border-gray-300 rounded-lg bg-white px-2">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runSearch()}
              placeholder="이메일 포함 검색"
              className="text-sm py-2 w-52 min-w-[10rem] outline-none text-gray-800"
            />
          </div>
          <button
            type="button"
            onClick={() => runSearch()}
            className="text-sm px-3 py-2 rounded-lg bg-gray-800 text-white hover:bg-gray-700"
          >
            검색
          </button>
          {q ? (
            <button
              type="button"
              onClick={() => clearSearch()}
              className="text-sm px-3 py-2 rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
            >
              검색 초기화
            </button>
          ) : null}
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

      {!q && (
        <div className="flex items-center gap-2 mb-4">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg border border-gray-300 bg-white disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
            이전
          </button>
          <button
            type="button"
            disabled={!hasMore || loading}
            onClick={() => setPage((p) => p + 1)}
            className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg border border-gray-300 bg-white disabled:opacity-40"
          >
            다음
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {loading && users.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
        </div>
      ) : (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-x-auto">
          <table className="w-full text-sm min-w-[960px]">
            <thead>
              <tr className="border-b border-gray-700">
                {[
                  '이메일',
                  '플랜',
                  '구독 상태',
                  '다음 결제',
                  '해지',
                  '이번 달 사용량',
                  '가입일',
                  '마지막 로그인',
                ].map((h) => (
                  <th key={h} className="px-3 py-3 text-left text-xs text-gray-400 font-medium whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-500">
                    회원이 없습니다
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const colorKey = u.plan
                  const plan = getPlan(u.plan)
                  const subLabel =
                    u.subscription_status != null
                      ? SUB_STATUS_LABEL[u.subscription_status] ?? u.subscription_status
                      : '—'
                  return (
                    <tr key={u.id} className="border-b border-gray-700/50 hover:bg-gray-700/20 transition-colors">
                      <td className="px-3 py-2.5 text-gray-200 max-w-[220px] truncate" title={u.email}>
                        {u.email || '—'}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span
                          className={`text-xs px-2 py-1 rounded-full font-medium inline-flex items-center gap-1 ${PLAN_COLOR[colorKey] ?? PLAN_COLOR.free}`}
                        >
                          {u.plan !== 'free' && <Crown className="h-3 w-3" />}
                          {plan.name}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gray-300 whitespace-nowrap">{subLabel}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-400 whitespace-nowrap">
                        {u.current_period_end
                          ? new Date(u.current_period_end).toLocaleDateString('ko-KR')
                          : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-xs whitespace-nowrap">
                        {u.cancel_at_period_end ? (
                          <span className="text-orange-300">예정</span>
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-[11px] text-gray-400 leading-snug whitespace-nowrap">
                        자격 {u.usage.eligibility_check} · 문서 {u.usage.document_generate} · 심사{' '}
                        {u.usage.evaluation}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gray-400 whitespace-nowrap">
                        {new Date(u.created_at).toLocaleDateString('ko-KR')}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gray-400 whitespace-nowrap">
                        {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString('ko-KR') : '—'}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
