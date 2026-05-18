'use client'

import { useState } from 'react'
import { Loader2, RefreshCw, Wrench } from 'lucide-react'
import { readApiError } from '@/lib/api/readApiError'

type SyncHealth = 'ok' | 'incomplete_sync' | 'gaps' | 'api_error'

type SourceReport = {
  source: string
  label: string
  health: SyncHealth
  api_total_ids: number
  api_open_ids: number
  skipped_closed: number
  db_stored_ids: number
  missing_open: { external_id: string; title: string }[]
  orphan_in_db: { id: string; external_id: string; title: string; synced_at: string | null }[]
  truncated: boolean
  note?: string
  api_fetch_error?: string
}

type VerifySummary = {
  ok: boolean
  checked_at: string
  overall_health: SyncHealth
  sources: SourceReport[]
  message?: string
}

type SyncSourceKey = 'all' | 'bizinfo' | 'kstartup' | 'smes24'

const SOURCE_TABS: { key: SyncSourceKey; label: string }[] = [
  { key: 'all', label: '3출처' },
  { key: 'bizinfo', label: '기업마당' },
  { key: 'kstartup', label: 'K-Startup' },
  { key: 'smes24', label: '중소벤처24' },
]

const HEALTH_LABEL: Record<SyncHealth, string> = {
  ok: '정상',
  incomplete_sync: '불완전 동기화',
  gaps: '미저장 갭',
  api_error: 'API 오류',
}

export function ProgramsSyncVerifyPanel() {
  const [source, setSource] = useState<SyncSourceKey>('all')
  const [data, setData] = useState<VerifySummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [healing, setHealing] = useState(false)
  const [error, setError] = useState('')
  const [actionMessage, setActionMessage] = useState('')

  const runVerify = async () => {
    setLoading(true)
    setError('')
    setActionMessage('')
    try {
      const res = await fetch(`/api/admin/sync/verify?source=${source}`)
      const json = (await res.json()) as VerifySummary
      if (!res.ok) throw new Error(readApiError(json, '검증에 실패했습니다.'))
      setData(json)
    } catch (e) {
      setData(null)
      setError(e instanceof Error ? e.message : '오류')
    } finally {
      setLoading(false)
    }
  }

  const runHeal = async () => {
    setHealing(true)
    setError('')
    setActionMessage('')
    try {
      const res = await fetch(`/api/admin/sync/heal?source=${source}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source }),
      })
      const json = (await res.json()) as { message?: string; verify?: VerifySummary }
      if (!res.ok) throw new Error(readApiError(json, '보강에 실패했습니다.'))
      setData(json.verify ?? null)
      setActionMessage(json.message ?? '보강 완료')
    } catch (e) {
      setError(e instanceof Error ? e.message : '보강 오류')
    } finally {
      setHealing(false)
    }
  }

  const displaySources =
    data?.sources.filter((s) => source === 'all' || s.source === source) ?? []

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-600 max-w-2xl">
          동기화와 동일한 API·정규화 기준으로 비교합니다. <strong>미저장(모집중)</strong>만 갭이며, 마감 공고는
          신규 저장 생략(의도)입니다. 불완전 동기화(Vercel 페이지 상한) 시 보강 대신 로컬{' '}
          <code className="text-xs bg-gray-100 px-1 rounded">npm run sync</code>를 권장합니다.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void runVerify()}
            disabled={loading || healing}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            검증
          </button>
          <button
            type="button"
            onClick={() => void runHeal()}
            disabled={loading || healing || !data}
            className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-50"
          >
            {healing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wrench className="h-4 w-4" />}
            보강 동기화
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {SOURCE_TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setSource(key)}
            className={`px-3 py-1.5 rounded-lg text-sm border ${
              source === key
                ? 'bg-slate-800 text-white border-slate-800'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {actionMessage && (
        <p className="text-sm text-green-800 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          {actionMessage}
        </p>
      )}

      {data && (
        <>
          <p className="text-xs text-gray-500">
            전체 상태: <strong>{HEALTH_LABEL[data.overall_health]}</strong>
            {data.checked_at && ` · ${new Date(data.checked_at).toLocaleString('ko-KR')}`}
          </p>

          {displaySources.map((s) => (
            <SourceCard key={s.source} report={s} />
          ))}
        </>
      )}
    </div>
  )
}

function SourceCard({ report }: { report: SourceReport }) {
  return (
    <div className="rounded-xl border bg-white p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-gray-900">
          {report.label}{' '}
          <span
            className={`text-xs font-normal px-2 py-0.5 rounded-full ${
              report.health === 'ok'
                ? 'bg-green-100 text-green-800'
                : report.health === 'incomplete_sync'
                  ? 'bg-amber-100 text-amber-900'
                  : 'bg-red-100 text-red-800'
            }`}
          >
            {HEALTH_LABEL[report.health]}
          </span>
        </h3>
        {report.truncated && (
          <span className="text-xs text-amber-800">API 페이지 상한 · 불완전</span>
        )}
      </div>

      {report.api_fetch_error && (
        <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {report.api_fetch_error}
        </p>
      )}

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5 text-sm">
        <MiniStat label="API ID" value={report.api_total_ids} />
        <MiniStat label="DB 저장" value={report.db_stored_ids} />
        <MiniStat label="미저장(모집중)" value={report.missing_open.length} warn={report.health === 'gaps'} />
        <MiniStat label="마감 생략" value={report.skipped_closed} />
        <MiniStat label="유령 후보" value={report.orphan_in_db.length} warn={report.orphan_in_db.length > 0} />
      </div>

      {report.note && (
        <p className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2">{report.note}</p>
      )}

      {report.missing_open.length > 0 && (
        <ListBlock title="모집중인데 DB에 없음 (상위)" items={report.missing_open.map((r) => `${r.external_id} — ${r.title}`)} />
      )}
      {report.orphan_in_db.length > 0 && (
        <ListBlock title="유령 후보 (상위)" items={report.orphan_in_db.map((r) => `${r.external_id} — ${r.title}`)} />
      )}
    </div>
  )
}

function MiniStat({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className="rounded-lg border px-3 py-2">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-lg font-semibold ${warn && value > 0 ? 'text-amber-600' : 'text-gray-900'}`}>
        {value.toLocaleString()}
      </p>
    </div>
  )
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-700 mb-1">{title}</p>
      <ul className="text-xs text-gray-600 max-h-32 overflow-y-auto list-disc list-inside space-y-0.5">
        {items.slice(0, 20).map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  )
}
