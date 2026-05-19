'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Users,
  Crown,
  RefreshCw,
  Search,
  AlertCircle,
  Download,
  UserPlus,
  Moon,
  FileText,
  CreditCard,
} from 'lucide-react'
import { readApiError } from '@/lib/api/readApiError'
import { UserDetailDrawer } from '@/components/admin/users/UserDetailDrawer'
import { OnlineUsersPanel } from '@/components/admin/users/OnlineUsersPanel'
import type { UsersFiltersValues } from '@/components/admin/users/UsersFiltersToolbar'
import { UsersFiltersToolbar } from '@/components/admin/users/UsersFiltersToolbar'
import type { AdminUserRow } from '@/components/admin/users/UsersTable'
import { UsersTable } from '@/components/admin/users/UsersTable'

type Summary = {
  totalScanned: number
  newUsers7d: number
  inactive30d: number
  docUsersThisMonth: number
  pastDue: number
  byPlan: { free: number; starter: number; pro: number }
  truncated?: boolean
}

const defaultFilters: UsersFiltersValues = {
  plan: 'all',
  status: 'all',
  inactiveDays: '',
  minDocuments: '',
  domain: '',
  segment: '',
  sort: 'created_desc',
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserRow[]>([])
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
  const [filters, setFilters] = useState<UsersFiltersValues>(defaultFilters)
  const [appliedFilters, setAppliedFilters] = useState<UsersFiltersValues>(defaultFilters)
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
            label: '스캔 회원',
            value: summary?.totalScanned,
            icon: Users,
            onClick: () => resetFilters(),
          },
          {
            label: '7일 신규',
            value: summary?.newUsers7d,
            icon: UserPlus,
            onClick: () => applyKpiFilter('new7'),
          },
          {
            label: '30일 미접속',
            value: summary?.inactive30d,
            icon: Moon,
            onClick: () => applyKpiFilter('inactive30'),
          },
          {
            label: '이번 달 문서 사용',
            value: summary?.docUsersThisMonth,
            icon: FileText,
            onClick: () => applyKpiFilter('docs'),
          },
          {
            label: '연체 구독',
            value: summary?.pastDue,
            icon: CreditCard,
            onClick: () => applyKpiFilter('past_due'),
          },
          {
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
            <p className="text-lg font-bold text-gray-900">{summaryLoading ? '…' : value ?? '—'}</p>
          </button>
        ))}
      </div>
      {summary?.truncated && (
        <p className="text-xs text-amber-700 mb-3">
          통계는 최대 {summary.totalScanned}명까지 스캔했습니다. 정확한 전체 수는 Supabase 대시보드를 참고하세요.
        </p>
      )}

      <UsersFiltersToolbar filters={filters} setFilters={setFilters} onApply={applyFilters} onReset={resetFilters} />

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

      <UsersTable
        users={users}
        loading={loading}
        page={page}
        setPage={setPage}
        hasMore={hasMore}
        onOpenUser={openUser}
      />

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
