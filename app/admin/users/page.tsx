'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Loader2,
  Users,
  Crown,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Search,
  AlertCircle,
  Download,
  UserPlus,
  Moon,
  FileText,
  CreditCard,
} from 'lucide-react'
import { readApiError } from '@/lib/api/readApiError'
import { getPlan, type PlanId } from '@/lib/billing/plans'
import { UserDetailDrawer } from '@/components/admin/users/UserDetailDrawer'
import { OnlineUsersPanel } from '@/components/admin/users/OnlineUsersPanel'

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

type Summary = {
  totalScanned: number
  newUsers7d: number
  inactive30d: number
  docUsersThisMonth: number
  pastDue: number
  byPlan: { free: number; starter: number; pro: number }
  truncated?: boolean
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

type Filters = {
  plan: string
  status: string
  inactiveDays: string
  minDocuments: string
  domain: string
  segment: string
  sort: string
}

const defaultFilters: Filters = {
  plan: 'all',
  status: 'all',
  inactiveDays: '',
  minDocuments: '',
  domain: '',
  segment: '',
  sort: 'created_desc',
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState<number | null>(null)
  const [totalPages, setTotalPages] = useState<number | null>(null)
  const [scanMode, setScanMode] = useState(false)
  const [q, setQ] = useState('')
  const [qInput, setQInput] = useState('')
  const [filters, setFilters] = useState<Filters>(defaultFilters)
  const [appliedFilters, setAppliedFilters] = useState<Filters>(defaultFilters)
  const [scannedPages, setScannedPages] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const buildParams = useCallback(() => {
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('perPage', '40')
    if (q.trim()) params.set('q', q.trim())
    if (appliedFilters.plan !== 'all') params.set('plan', appliedFilters.plan)
    if (appliedFilters.status !== 'all') params.set('status', appliedFilters.status)
    if (appliedFilters.inactiveDays) params.set('inactiveDays', appliedFilters.inactiveDays)
    if (appliedFilters.minDocuments) params.set('minDocuments', appliedFilters.minDocuments)
    if (appliedFilters.domain.trim()) params.set('domain', appliedFilters.domain.trim())
    if (appliedFilters.segment) params.set('segment', appliedFilters.segment)
    if (appliedFilters.sort) params.set('sort', appliedFilters.sort)
    return params
  }, [page, q, appliedFilters])

  const loadSummary = useCallback(async () => {
    try {
      setSummaryLoading(true)
      const res = await fetch('/api/admin/users/summary')
      const json = await res.json()
      if (res.ok && json.summary) setSummary(json.summary as Summary)
    } catch {
      /* ignore */
    } finally {
      setSummaryLoading(false)
    }
  }, [])

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const res = await fetch(`/api/admin/users?${buildParams().toString()}`)
      const json = await res.json()
      if (!res.ok) {
        throw new Error(readApiError(json, '회원 데이터를 불러오지 못했습니다.'))
      }
      setUsers(json.users ?? [])
      setHasMore(Boolean(json.hasMore))
      setTotal(json.total ?? null)
      setTotalPages(json.totalPages ?? null)
      setScanMode(Boolean(json.scanMode))
      setScannedPages(Number(json.scannedAuthPages) || 0)
    } catch (err) {
      setUsers([])
      setHasMore(false)
      setError(err instanceof Error ? err.message : '회원 데이터를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [buildParams])

  useEffect(() => {
    void loadSummary()
  }, [loadSummary])

  useEffect(() => {
    void load()
  }, [load])

  const applyFilters = () => {
    setPage(1)
    setAppliedFilters({ ...filters })
  }

  const resetFilters = () => {
    setFilters(defaultFilters)
    setAppliedFilters(defaultFilters)
    setQInput('')
    setQ('')
    setPage(1)
  }

  const runSearch = () => {
    setPage(1)
    setQ(qInput.trim())
  }

  const openUser = (id: string) => {
    setSelectedId(id)
    setDrawerOpen(true)
  }

  const applyKpiFilter = (kind: 'new7' | 'inactive30' | 'docs' | 'past_due' | 'plan_free' | 'plan_starter' | 'plan_pro') => {
    const next = { ...defaultFilters }
    if (kind === 'new7') {
      /* KPI only — no direct date filter; show all sorted by created */
      next.sort = 'created_desc'
    } else if (kind === 'inactive30') {
      next.inactiveDays = '30'
    } else if (kind === 'docs') {
      next.minDocuments = '1'
    } else if (kind === 'past_due') {
      next.status = 'past_due'
    } else if (kind === 'plan_free') next.plan = 'free'
    else if (kind === 'plan_starter') next.plan = 'starter'
    else if (kind === 'plan_pro') next.plan = 'pro'
    setFilters(next)
    setAppliedFilters(next)
    setPage(1)
  }

  const exportCsv = () => {
    const params = buildParams()
    params.delete('page')
    params.delete('perPage')
    window.open(`/api/admin/users/export?${params.toString()}`, '_blank')
  }

  const pageLabel =
    scanMode && total != null && totalPages != null
      ? `${total}명 · ${page}/${totalPages}페이지`
      : `페이지 ${page}${hasMore ? ' · 다음 있음' : ''}`

  return (
    <div className="p-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Users className="h-5 w-5 text-cyan-400" />
          회원 관리
          <span className="text-sm font-normal text-gray-500 ml-1">{pageLabel}</span>
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
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            새로고침
          </button>
          <button
            type="button"
            onClick={() => exportCsv()}
            className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
          >
            <Download className="h-4 w-4" />
            CSV
          </button>
        </div>
      </div>

      <OnlineUsersPanel onSelectUser={(id) => openUser(id)} />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
        {[
          {
            key: 'total' as const,
            label: '스캔 회원',
            value: summary?.totalScanned,
            icon: Users,
            onClick: () => resetFilters(),
          },
          {
            key: 'new7' as const,
            label: '7일 신규',
            value: summary?.newUsers7d,
            icon: UserPlus,
            onClick: () => applyKpiFilter('new7'),
          },
          {
            key: 'inactive30' as const,
            label: '30일 미접속',
            value: summary?.inactive30d,
            icon: Moon,
            onClick: () => applyKpiFilter('inactive30'),
          },
          {
            key: 'docs' as const,
            label: '이번 달 문서 사용',
            value: summary?.docUsersThisMonth,
            icon: FileText,
            onClick: () => applyKpiFilter('docs'),
          },
          {
            key: 'past_due' as const,
            label: '연체 구독',
            value: summary?.pastDue,
            icon: CreditCard,
            onClick: () => applyKpiFilter('past_due'),
          },
          {
            key: 'pro' as const,
            label: 'Pro',
            value: summary?.byPlan.pro,
            icon: Crown,
            onClick: () => applyKpiFilter('plan_pro'),
          },
        ].map(({ label, value, icon: Icon, onClick }) => (
          <button
            key={label}
            type="button"
            onClick={onClick}
            className="text-left rounded-xl border border-gray-200 bg-white p-3 hover:border-indigo-300 hover:shadow-sm transition"
          >
            <Icon className="h-4 w-4 text-gray-400 mb-1" />
            <p className="text-[11px] text-gray-500">{label}</p>
            <p className="text-lg font-bold text-gray-900">
              {summaryLoading ? '…' : (value ?? '—')}
            </p>
          </button>
        ))}
      </div>
      {summary?.truncated && (
        <p className="text-xs text-amber-700 mb-3">
          통계는 최대 {summary.totalScanned}명까지 스캔했습니다. 정확한 전체 수는 Supabase 대시보드를 참고하세요.
        </p>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-3 mb-4 flex flex-wrap gap-2 items-end">
        <label className="text-xs text-gray-600">
          플랜
          <select
            value={filters.plan}
            onChange={(e) => setFilters((f) => ({ ...f, plan: e.target.value }))}
            className="mt-0.5 block text-sm border rounded-lg px-2 py-1.5"
          >
            <option value="all">전체</option>
            <option value="free">Free</option>
            <option value="starter">Starter</option>
            <option value="pro">Pro</option>
          </select>
        </label>
        <label className="text-xs text-gray-600">
          구독 상태
          <select
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
            className="mt-0.5 block text-sm border rounded-lg px-2 py-1.5"
          >
            <option value="all">전체</option>
            <option value="none">없음</option>
            <option value="active">활성</option>
            <option value="trialing">체험</option>
            <option value="past_due">연체</option>
            <option value="canceled">해지</option>
          </select>
        </label>
        <label className="text-xs text-gray-600">
          정렬
          <select
            value={filters.sort}
            onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value }))}
            className="mt-0.5 block text-sm border rounded-lg px-2 py-1.5"
          >
            <option value="created_desc">가입일 최신</option>
            <option value="created_asc">가입일 오래된</option>
            <option value="last_sign_in_desc">최근 로그인</option>
            <option value="last_sign_in_asc">로그인 오래됨</option>
            <option value="docs_desc">문서 사용 많음</option>
          </select>
        </label>
        <label className="text-xs text-gray-600">
          세그먼트
          <select
            value={filters.segment}
            onChange={(e) => setFilters((f) => ({ ...f, segment: e.target.value }))}
            className="mt-0.5 block text-sm border rounded-lg px-2 py-1.5"
          >
            <option value="">없음</option>
            <option value="dormant">휴면(30일+)</option>
            <option value="high_usage">고사용</option>
            <option value="onboarding_dropout">온보딩 이탈(7일·문서0)</option>
          </select>
        </label>
        <label className="text-xs text-gray-600">
          미접속(일)
          <input
            type="number"
            min={0}
            value={filters.inactiveDays}
            onChange={(e) => setFilters((f) => ({ ...f, inactiveDays: e.target.value }))}
            placeholder="30"
            className="mt-0.5 block text-sm border rounded-lg px-2 py-1.5 w-20"
          />
        </label>
        <label className="text-xs text-gray-600">
          문서 최소
          <input
            type="number"
            min={0}
            value={filters.minDocuments}
            onChange={(e) => setFilters((f) => ({ ...f, minDocuments: e.target.value }))}
            className="mt-0.5 block text-sm border rounded-lg px-2 py-1.5 w-20"
          />
        </label>
        <label className="text-xs text-gray-600">
          도메인
          <input
            value={filters.domain}
            onChange={(e) => setFilters((f) => ({ ...f, domain: e.target.value }))}
            placeholder="gmail.com"
            className="mt-0.5 block text-sm border rounded-lg px-2 py-1.5 w-28"
          />
        </label>
        <button
          type="button"
          onClick={() => applyFilters()}
          className="text-sm px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500"
        >
          필터 적용
        </button>
        <button
          type="button"
          onClick={() => resetFilters()}
          className="text-sm px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          초기화
        </button>
      </div>

      {q && scanMode && (
        <p className="text-sm text-amber-700 mb-2">
          검색·필터 결과 {total ?? users.length}명 (Auth 스캔 {scannedPages}페이지)
        </p>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

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
                  const plan = getPlan(u.plan)
                  const subLabel =
                    u.subscription_status != null
                      ? SUB_STATUS_LABEL[u.subscription_status] ?? u.subscription_status
                      : '—'
                  return (
                    <tr
                      key={u.id}
                      onClick={() => openUser(u.id)}
                      className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors cursor-pointer"
                    >
                      <td className="px-3 py-2.5 text-gray-200 max-w-[220px] truncate" title={u.email}>
                        {u.email || '—'}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span
                          className={`text-xs px-2 py-1 rounded-full font-medium inline-flex items-center gap-1 ${PLAN_COLOR[u.plan] ?? PLAN_COLOR.free}`}
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

      <UserDetailDrawer
        userId={selectedId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onPlanUpdated={() => {
          void load()
          void loadSummary()
        }}
      />
    </div>
  )
}
