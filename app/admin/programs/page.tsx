'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, Search, Eye, EyeOff, Download, Copy } from 'lucide-react'
import { readApiError } from '@/lib/api/readApiError'
import { stripHtmlToText } from '@/lib/utils/stripHtml'
import { EXPORT_FILE_PREFIX } from '@/lib/site-config'
import { AdminOpsPageShell } from '@/components/admin/AdminOpsPageShell'
import { ProgramsDuplicatesPanel } from '@/components/admin/ProgramsDuplicatesPanel'
import { ProgramsSyncVerifyPanel } from '@/components/admin/ProgramsSyncVerifyPanel'

interface Program {
  id: string
  title: string
  organization: string | null
  region: string | null
  status: string
  visibility_status: string
  application_end_date: string | null
  source: string
  recommendation_score: number | null
}

interface QualitySummary {
  total: number
  region_null_pct: number
  industry_tags_empty_pct: number
  html_residual_pct: number
}

const STATUS_LABEL: Record<string, string> = {
  active: '모집중',
  closing_soon: '마감임박',
  closed: '마감',
  inactive: '비활성',
}
const STATUS_COLOR: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  closing_soon: 'bg-orange-100 text-orange-700',
  closed: 'bg-gray-100 text-gray-600',
  inactive: 'bg-red-100 text-red-600',
}

const SOURCE_OPTIONS = ['bizinfo', 'kstartup', 'smba', 'manual'] as const

export default function AdminProgramsPage() {
  return (
    <Suspense
      fallback={
        <AdminOpsPageShell>
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          </div>
        </AdminOpsPageShell>
      }
    >
      <AdminProgramsContent />
    </Suspense>
  )
}

function AdminProgramsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const view = searchParams.get('view')
  const isDuplicates = view === 'duplicates'
  const isSyncVerify = view === 'sync-verify'

  const [programs, setPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [visibilityFilter, setVisibilityFilter] = useState('all')
  const [qualityFilter, setQualityFilter] = useState(() => searchParams.get('quality') ?? 'all')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [listError, setListError] = useState('')
  const [exporting, setExporting] = useState(false)
  const [quality, setQuality] = useState<QualitySummary | null>(null)
  const PER_PAGE = 20

  useEffect(() => {
    const q = searchParams.get('quality')
    if (q && q !== qualityFilter) setQualityFilter(q)
  }, [searchParams])

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/admin/programs/quality')
        const data = await res.json().catch(() => ({}))
        if (res.ok && data.ok) {
          setQuality({
            total: Number(data.total ?? 0),
            region_null_pct: Number(data.region_null_pct ?? 0),
            industry_tags_empty_pct: Number(data.industry_tags_empty_pct ?? 0),
            html_residual_pct: Number(data.html_residual_pct ?? 0),
          })
        }
      } catch {
        /* 품질 API 실패 시 목록만 표시 */
      }
    })()
  }, [])

  const loadPrograms = async () => {
    setLoading(true)
    setListError('')
    try {
      const q = new URLSearchParams()
      q.set('page', String(page))
      q.set('limit', String(PER_PAGE))
      if (search.trim()) q.set('q', search.trim())
      if (statusFilter !== 'all') q.set('status', statusFilter)
      if (sourceFilter !== 'all') q.set('source', sourceFilter)
      if (visibilityFilter !== 'all') q.set('visibility', visibilityFilter)
      if (qualityFilter !== 'all') q.set('quality', qualityFilter)

      const res = await fetch(`/api/admin/programs?${q}`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setListError(readApiError(data, '목록을 불러오지 못했습니다.'))
        setPrograms([])
        setTotal(0)
        return
      }
      setPrograms((data.programs ?? []) as Program[])
      setTotal(Number(data.total ?? 0))
    } catch {
      setListError('목록을 불러오지 못했습니다.')
      setPrograms([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isDuplicates && !isSyncVerify) void loadPrograms()
  }, [page, statusFilter, sourceFilter, visibilityFilter, qualityFilter, isDuplicates, isSyncVerify])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    void loadPrograms()
  }

  const setSubView = (sub: 'list' | 'duplicates' | 'sync-verify') => {
    const params = new URLSearchParams(searchParams.toString())
    if (sub === 'duplicates') params.set('view', 'duplicates')
    else if (sub === 'sync-verify') params.set('view', 'sync-verify')
    else params.delete('view')
    const qs = params.toString()
    router.push(qs ? `/admin/programs?${qs}` : '/admin/programs')
  }

  const applyQualityChip = (q: string) => {
    setQualityFilter(q)
    setPage(1)
    const params = new URLSearchParams(searchParams.toString())
    params.delete('view')
    if (q === 'all') params.delete('quality')
    else params.set('quality', q)
    const qs = params.toString()
    router.push(qs ? `/admin/programs?${qs}` : '/admin/programs')
  }

  const toggleVisibility = async (id: string, current: string) => {
    const next = current === 'visible' ? 'hidden' : 'visible'
    const res = await fetch('/api/admin/programs', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, visibility_status: next }),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setListError(readApiError(j, '노출 상태 변경에 실패했습니다.'))
      return
    }
    setPrograms((ps) => ps.map((p) => (p.id === id ? { ...p, visibility_status: next } : p)))
  }

  const handleExportCsv = async () => {
    setExporting(true)
    try {
      const res = await fetch('/api/export/csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'programs' }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setListError(readApiError(j, 'CSV보내기에 실패했습니다.'))
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${EXPORT_FILE_PREFIX}_programs_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE))

  return (
    <AdminOpsPageShell>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">공고 관리</h1>
          <p className="text-sm text-gray-500">
            {isDuplicates
              ? '동일 제목·출처 중복 그룹'
              : isSyncVerify
                ? '기업마당 ↔ DB 교차검증'
                : `전체 ${total.toLocaleString()}건`}
          </p>
        </div>
      </div>

      <div className="mb-4 flex gap-2 border-b">
        <button
          type="button"
          onClick={() => setSubView('list')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            !isDuplicates && !isSyncVerify ? 'border-slate-800 text-slate-900' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          목록
        </button>
        <button
          type="button"
          onClick={() => setSubView('duplicates')}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            isDuplicates ? 'border-slate-800 text-slate-900' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Copy className="h-3.5 w-3.5" />
          중복 공고
        </button>
        <button
          type="button"
          onClick={() => setSubView('sync-verify')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            isSyncVerify ? 'border-slate-800 text-slate-900' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          동기화 검증
        </button>
      </div>

      {isDuplicates ? (
        <ProgramsDuplicatesPanel />
      ) : isSyncVerify ? (
        <ProgramsSyncVerifyPanel />
      ) : (
        <>
          {quality && (
            <div className="mb-4 grid gap-3 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => applyQualityChip(qualityFilter === 'region_null' ? 'all' : 'region_null')}
                className={`rounded-xl border bg-white px-4 py-3 text-sm text-left transition-colors ${
                  qualityFilter === 'region_null' ? 'ring-2 ring-blue-500 border-blue-200' : 'hover:border-slate-300'
                }`}
              >
                <p className="text-xs text-gray-500">지역 미기재</p>
                <p className="text-lg font-semibold text-gray-900">{quality.region_null_pct}%</p>
                <p className="text-[10px] text-gray-400 mt-1">클릭 시 필터</p>
              </button>
              <button
                type="button"
                onClick={() =>
                  applyQualityChip(qualityFilter === 'no_industry_tags' ? 'all' : 'no_industry_tags')
                }
                className={`rounded-xl border bg-white px-4 py-3 text-sm text-left transition-colors ${
                  qualityFilter === 'no_industry_tags' ? 'ring-2 ring-blue-500 border-blue-200' : 'hover:border-slate-300'
                }`}
              >
                <p className="text-xs text-gray-500">업종 태그 없음</p>
                <p className="text-lg font-semibold text-gray-900">{quality.industry_tags_empty_pct}%</p>
                <p className="text-[10px] text-gray-400 mt-1">클릭 시 필터</p>
              </button>
              <div className="rounded-xl border bg-white px-4 py-3 text-sm">
                <p className="text-xs text-gray-500">HTML 잔여(샘플)</p>
                <p className="text-lg font-semibold text-gray-900">{quality.html_residual_pct}%</p>
              </div>
            </div>
          )}

          {listError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{listError}</div>
          )}

          <div className="bg-white rounded-xl border p-4 mb-4">
            <form onSubmit={handleSearch} className="flex flex-wrap gap-2">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="공고명 검색..."
                className="flex-1 min-w-[12rem] border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value)
                  setPage(1)
                }}
                className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">전체 상태</option>
                {Object.entries(STATUS_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
              <select
                value={sourceFilter}
                onChange={(e) => {
                  setSourceFilter(e.target.value)
                  setPage(1)
                }}
                className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">전체 출처</option>
                {SOURCE_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <select
                value={visibilityFilter}
                onChange={(e) => {
                  setVisibilityFilter(e.target.value)
                  setPage(1)
                }}
                className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">노출 전체</option>
                <option value="visible">노출 중</option>
                <option value="hidden">숨김</option>
              </select>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
              >
                <Search className="h-4 w-4" />
              </button>
            </form>
            {qualityFilter !== 'all' && (
              <p className="mt-2 text-xs text-blue-600">
                품질 필터: {qualityFilter}{' '}
                <button type="button" className="underline" onClick={() => applyQualityChip('all')}>
                  해제
                </button>
              </p>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
            </div>
          ) : programs.length === 0 ? (
            <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
              <p>공고 데이터가 없습니다.</p>
              <p className="text-xs mt-1">
                <Link href="/admin/sync" className="text-blue-600 hover:underline">
                  동기화
                </Link>
                를 실행하세요.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-xs text-gray-500 text-left">
                    <th className="px-4 py-3">공고명</th>
                    <th className="px-3 py-3">기관</th>
                    <th className="px-3 py-3">상태</th>
                    <th className="px-3 py-3">마감일</th>
                    <th className="px-3 py-3">출처</th>
                    <th className="px-3 py-3">노출</th>
                  </tr>
                </thead>
                <tbody>
                  {programs.map((p) => (
                    <tr key={p.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3 max-w-xs">
                        <Link href={`/search/${p.id}`} className="font-medium text-gray-900 truncate block hover:text-blue-600">
                          {stripHtmlToText(p.title)}
                        </Link>
                        <p className="text-xs text-gray-400">{p.region ? stripHtmlToText(p.region) : '지역 없음'}</p>
                      </td>
                      <td className="px-3 py-3 text-gray-600 text-xs">
                        {p.organization ? stripHtmlToText(p.organization) : '-'}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLOR[p.status] ?? 'bg-gray-100 text-gray-600'}`}
                        >
                          {STATUS_LABEL[p.status] ?? p.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-500">{p.application_end_date ?? '-'}</td>
                      <td className="px-3 py-3 text-xs text-gray-400">{p.source}</td>
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          onClick={() => toggleVisibility(p.id, p.visibility_status)}
                          className={`p-1.5 rounded ${p.visibility_status === 'visible' ? 'text-blue-500 hover:bg-blue-50' : 'text-gray-300 hover:bg-gray-50'}`}
                          title={p.visibility_status === 'visible' ? '노출 중 (클릭시 숨김)' : '숨김 (클릭시 노출)'}
                        >
                          {p.visibility_status === 'visible' ? (
                            <Eye className="h-4 w-4" />
                          ) : (
                            <EyeOff className="h-4 w-4" />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 p-4 border-t">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 border rounded text-sm disabled:opacity-40 hover:bg-gray-50"
                  >
                    이전
                  </button>
                  <span className="text-sm text-gray-500">
                    {page} / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1.5 border rounded text-sm disabled:opacity-40 hover:bg-gray-50"
                  >
                    다음
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => void handleExportCsv()}
              disabled={exporting}
              className="flex items-center gap-1.5 px-3 py-2 border rounded-lg text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              CSV보내기
            </button>
          </div>
        </>
      )}
    </AdminOpsPageShell>
  )
}
