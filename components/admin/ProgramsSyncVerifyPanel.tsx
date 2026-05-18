'use client'

import { useState } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'
import { readApiError } from '@/lib/api/readApiError'

type VerifyPayload = {
  ok: boolean
  api_unique_ids: number
  db_active_ids: number
  missing_in_db: { external_id: string; title: string }[]
  orphan_in_db: { id: string; external_id: string; title: string; synced_at: string | null }[]
  stale_sync_48h: { id: string; external_id: string; title: string; synced_at: string | null }[]
  truncated?: boolean
  note?: string
  checked_at?: string
  message?: string
  api_fetch_error?: string
  db_only?: boolean
}

export function ProgramsSyncVerifyPanel() {
  const [data, setData] = useState<VerifyPayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const run = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/programs/bizinfo-verify')
      const json = (await res.json()) as VerifyPayload
      if (!res.ok) throw new Error(readApiError(json, '교차검증에 실패했습니다.'))
      setData(json)
    } catch (e) {
      setData(null)
      setError(e instanceof Error ? e.message : '오류')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-600">
          기업마당 API 공고 ID와 DB(<code className="text-xs">source=bizinfo</code>)를 비교합니다. API 키·페이지 상한에 따라
          샘플 검증일 수 있습니다.
        </p>
        <button
          type="button"
          onClick={() => void run()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          검증 실행
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {data && (
        <>
          {data.api_fetch_error && (
            <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <strong>기업마당 API:</strong> {data.api_fetch_error}
              {data.db_only && (
                <span className="block mt-1 text-xs text-amber-800">
                  아래는 DB 기준(유령·미동기화)만 표시됩니다. API 교차 비교는 로컬 동기화 후 다시 시도하세요.
                </span>
              )}
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-4">
            <Stat label="API 고유 ID" value={data.api_unique_ids} />
            <Stat label="DB 활성 건" value={data.db_active_ids} />
            <Stat label="DB 누락" value={data.missing_in_db?.length ?? 0} warn />
            <Stat label="DB 유령" value={data.orphan_in_db?.length ?? 0} warn />
          </div>
          {data.note && <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">{data.note}</p>}
          {data.checked_at && (
            <p className="text-xs text-gray-400">검증 시각: {new Date(data.checked_at).toLocaleString('ko-KR')}</p>
          )}

          <Section title="API에는 있으나 DB에 없음 (상위 100건)" empty="누락 없음">
            {(data.missing_in_db ?? []).map((r) => (
              <li key={r.external_id} className="text-sm text-gray-800">
                <span className="text-gray-400 font-mono text-xs mr-2">{r.external_id}</span>
                {r.title}
              </li>
            ))}
          </Section>

          <Section title="DB에는 있으나 API 샘플에 없음 (유령 후보)" empty="유령 후보 없음">
            {(data.orphan_in_db ?? []).map((r) => (
              <li key={r.id} className="text-sm text-gray-800">
                <span className="text-gray-400 font-mono text-xs mr-2">{r.external_id}</span>
                {r.title}
              </li>
            ))}
          </Section>

          <Section title="48시간 이상 미동기화 (bizinfo)" empty="해당 없음">
            {(data.stale_sync_48h ?? []).slice(0, 30).map((r) => (
              <li key={r.id} className="text-sm text-gray-800">
                {r.title}
                <span className="text-gray-400 text-xs ml-2">
                  {r.synced_at ? new Date(r.synced_at).toLocaleString('ko-KR') : 'synced_at 없음'}
                </span>
              </li>
            ))}
          </Section>
        </>
      )}
    </div>
  )
}

function Stat({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className="rounded-xl border bg-white px-4 py-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-2xl font-semibold ${warn && value > 0 ? 'text-amber-600' : 'text-gray-900'}`}>
        {value.toLocaleString()}
      </p>
    </div>
  )
}

function Section({
  title,
  empty,
  children,
}: {
  title: string
  empty: string
  children: React.ReactNode
}) {
  const items = Array.isArray(children) ? children : [children]
  const hasItems = items.some((c) => c !== null && c !== false)
  return (
    <div className="rounded-xl border bg-white p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-2">{title}</h3>
      {!hasItems ? (
        <p className="text-sm text-gray-500">{empty}</p>
      ) : (
        <ul className="space-y-1 max-h-64 overflow-y-auto list-disc list-inside">{children}</ul>
      )}
    </div>
  )
}

