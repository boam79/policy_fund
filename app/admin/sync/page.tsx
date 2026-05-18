'use client'

import { useState, useEffect } from 'react'
import { RefreshCw, Loader2, CheckCircle, XCircle, AlertTriangle, Terminal } from 'lucide-react'
import { readApiError } from '@/lib/api/readApiError'
import { AdminOpsPageShell } from '@/components/admin/AdminOpsPageShell'
import { SYNC_POLICY } from '@/lib/gov-support/sync/syncPolicy'
import { ProgramsSyncVerifyPanel } from '@/components/admin/ProgramsSyncVerifyPanel'

interface SyncLog {
  id: string
  source: string
  status: string
  requested_count: number
  inserted_count: number
  updated_count: number
  failed_count: number
  started_at: string
  ended_at: string | null
  error_message: string | null
}

type SyncSourceKey = 'all' | 'bizinfo' | 'kstartup' | 'smes24'

export default function AdminSyncPage() {
  const [logs, setLogs] = useState<SyncLog[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState<SyncSourceKey | null>(null)
  const [message, setMessage] = useState('')
  const [loadError, setLoadError] = useState('')
  const [verifyAfterSync, setVerifyAfterSync] = useState(true)

  const loadLogs = async () => {
    setLoadError('')
    try {
      const res = await fetch('/api/admin/sync-logs')
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setLoadError(readApiError(data, '동기화 이력을 불러오지 못했습니다.'))
        setLogs([])
        return
      }
      setLogs((data.logs ?? []) as SyncLog[])
    } catch {
      setLoadError('동기화 이력을 불러오지 못했습니다.')
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLogs()
  }, [])

  const handleSync = async (source: SyncSourceKey) => {
    setSyncing(source)
    setMessage('')
    try {
      const res = await fetch(`/api/admin/sync?source=${source}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, verify: verifyAfterSync }),
      })
      const data = await res.json().catch(() => ({}))
      setMessage(res.ok ? String(data.message ?? '동기화 완료') : readApiError(data, '동기화 실패'))
      setTimeout(loadLogs, 2000)
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : '오류 발생')
    } finally {
      setSyncing(null)
    }
  }

  return (
    <AdminOpsPageShell>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">공고 동기화</h1>
          <p className="text-sm text-gray-500 mt-1">
            실질적 전부: {SYNC_POLICY.bizinfo.description} · {SYNC_POLICY.kstartup.description} ·{' '}
            {SYNC_POLICY.smes24.description}
          </p>
        </div>
      </div>

      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4 text-sm text-emerald-900 space-y-2">
        <p className="font-medium flex items-center gap-2">
          <Terminal className="h-4 w-4" />
          권장: 로컬에서 전량 수집 (Vercel·Supabase 무료 플랜)
        </p>
        <p className="text-emerald-800/90">
          프로젝트 루트에서 <code className="bg-emerald-100/80 px-1 rounded">npm run sync</code> — 페이지
          상한 없이 기업마당 totCnt까지 수집합니다. macOS launchd로 매일 09:00 자동 실행을 권장합니다.
        </p>
      </div>

      <div className="bg-white border rounded-xl p-4 mb-6">
        <p className="text-xs font-medium text-gray-600 mb-3">Vercel에서 출처별 빠른 갱신 (페이지 상한 있음)</p>
        <label className="flex items-center gap-2 text-sm text-gray-600 mb-3 cursor-pointer">
          <input
            type="checkbox"
            checked={verifyAfterSync}
            onChange={(e) => setVerifyAfterSync(e.target.checked)}
            className="rounded border-gray-300"
          />
          동기화 직후 검증 실행
        </label>
        <div className="flex flex-wrap gap-2">
          {(
            [
              { key: 'all' as const, label: '3출처 한번에' },
              { key: 'bizinfo' as const, label: '기업마당만' },
              { key: 'kstartup' as const, label: 'K-Startup만' },
              { key: 'smes24' as const, label: '중소벤처24만' },
            ] as const
          ).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => void handleSync(key)}
              disabled={syncing !== null}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
            >
              {syncing === key ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {label}
            </button>
          ))}
        </div>
      </div>

      {message && (
        <div
          className={`mb-4 p-3 rounded-lg text-sm border ${
            message.includes('오류') || message.includes('실패')
              ? 'bg-red-50 border-red-200 text-red-700'
              : 'bg-green-50 border-green-200 text-green-700'
          }`}
        >
          {message}
        </div>
      )}

      {loadError && (
        <div className="mb-4 p-3 rounded-lg text-sm border border-amber-200 bg-amber-50 text-amber-900">
          {loadError}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-sm text-blue-800">
        환경 변수: <code className="bg-blue-100 px-1 rounded">SYNC_SMES24_LOOKBACK_DAYS=730</code> (기본) ·
        Vercel <code className="bg-blue-100 px-1 rounded">SYNC_VERCEL_SAFE_MAX_PAGES=10</code> · 검증{' '}
        <code className="bg-blue-100 px-1 rounded">SYNC_HEAL_MAX_IDS=50</code> (Vercel 보강 상한)
      </div>

      <div className="bg-white border rounded-xl p-4 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">동기화 검증 · 보강</h2>
        <ProgramsSyncVerifyPanel />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center text-gray-400">동기화 이력이 없습니다.</div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 text-left">
                <th className="px-4 py-3">시작 시각</th>
                <th className="px-3 py-3">출처</th>
                <th className="px-3 py-3">상태</th>
                <th className="px-3 py-3">수집</th>
                <th className="px-3 py-3">저장</th>
                <th className="px-3 py-3">실패</th>
                <th className="px-3 py-3">오류</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-xs text-gray-500">
                    {new Date(l.started_at).toLocaleString('ko-KR')}
                  </td>
                  <td className="px-3 py-2.5 font-medium">{l.source}</td>
                  <td className="px-3 py-2.5">
                    {l.status === 'success' ? (
                      <span className="flex items-center gap-1 text-green-600 text-xs">
                        <CheckCircle className="h-3.5 w-3.5" />
                        성공
                      </span>
                    ) : l.status === 'partial' ? (
                      <span className="flex items-center gap-1 text-amber-600 text-xs">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        부분성공
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-600 text-xs">
                        <XCircle className="h-3.5 w-3.5" />
                        실패
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-center">{l.requested_count}</td>
                  <td className="px-3 py-2.5 text-center text-blue-600">{l.inserted_count}</td>
                  <td className="px-3 py-2.5 text-center text-red-500">{l.failed_count}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-400 max-w-xs truncate">
                    {l.error_message ?? '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminOpsPageShell>
  )
}
