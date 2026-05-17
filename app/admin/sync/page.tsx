'use client'

import { useState, useEffect } from 'react'
import { RefreshCw, Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import { readApiError } from '@/lib/api/readApiError'
import { AdminOpsPageShell } from '@/components/admin/AdminOpsPageShell'

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

export default function AdminSyncPage() {
  const [logs, setLogs] = useState<SyncLog[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [message, setMessage] = useState('')
  const [loadError, setLoadError] = useState('')

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

  const handleSync = async () => {
    setSyncing(true)
    setMessage('')
    try {
      const res = await fetch('/api/admin/sync', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      setMessage(res.ok ? (data.message ?? '동기화가 요청되었습니다') : readApiError(data, '동기화 실패'))
      setTimeout(loadLogs, 3000)
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : '오류 발생')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <AdminOpsPageShell>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">공고 동기화</h1>
          <p className="text-sm text-gray-500">기업마당·K-Startup·중소벤처24 공고를 수집합니다</p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          지금 동기화
        </button>
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
        <div className="mb-4 p-3 rounded-lg text-sm border border-amber-200 bg-amber-50 text-amber-900">{loadError}</div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-sm text-blue-700">
        💡 매일 오전 9시 macOS launchd로 자동 동기화됩니다. 수동 동기화는 위 버튼을 사용하세요.
        Vercel Pro 플랜 전환 시 <code className="bg-blue-100 px-1 rounded">docs/upgrade-to-pro.md</code>를 참고하세요.
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
                  <td className="px-4 py-2.5 text-xs text-gray-500">{new Date(l.started_at).toLocaleString('ko-KR')}</td>
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
                  <td className="px-3 py-2.5 text-xs text-gray-400 max-w-xs truncate">{l.error_message ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminOpsPageShell>
  )
}
