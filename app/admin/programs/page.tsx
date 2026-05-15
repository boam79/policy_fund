'use client'

import { useEffect, useState } from 'react'
import { Loader2, Search, Eye, EyeOff, Download } from 'lucide-react'
import { readApiError } from '@/lib/api/readApiError'
import { stripHtmlToText } from '@/lib/utils/stripHtml'
import { EXPORT_FILE_PREFIX } from '@/lib/site-config'

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

export default function AdminProgramsPage() {
  const [programs, setPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [listError, setListError] = useState('')
  const [exporting, setExporting] = useState(false)
  const PER_PAGE = 20

  const loadPrograms = async () => {
    setLoading(true)
    setListError('')
    try {
      const q = new URLSearchParams()
      q.set('page', String(page))
      q.set('limit', String(PER_PAGE))
      if (search.trim()) q.set('q', search.trim())
      if (statusFilter !== 'all') q.set('status', statusFilter)

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
    loadPrograms()
  }, [page, statusFilter])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    void loadPrograms()
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
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">공고 관리</h1>
          <p className="text-sm text-gray-500">전체 {total.toLocaleString()}건</p>
        </div>
      </div>

      {listError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{listError}</div>
      )}

      <div className="bg-white rounded-xl border p-4 mb-4">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="공고명 검색..."
            className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">
            <Search className="h-4 w-4" />
          </button>
        </form>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
        </div>
      ) : programs.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
          <p>공고 데이터가 없습니다.</p>
          <p className="text-xs mt-1">대시보드에서 동기화를 실행하세요.</p>
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
                    <p className="font-medium text-gray-900 truncate">{stripHtmlToText(p.title)}</p>
                    <p className="text-xs text-gray-400">{p.region ? stripHtmlToText(p.region) : ''}</p>
                  </td>
                  <td className="px-3 py-3 text-gray-600 text-xs">{p.organization ? stripHtmlToText(p.organization) : '-'}</td>
                  <td className="px-3 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLOR[p.status] ?? 'bg-gray-100 text-gray-600'}`}>
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
                      {p.visibility_status === 'visible' ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
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
          CSV 내보내기
        </button>
      </div>
    </div>
  )
}
