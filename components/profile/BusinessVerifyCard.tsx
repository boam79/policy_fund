'use client'

import { useState } from 'react'
import { ShieldCheck, Loader2 } from 'lucide-react'
import { readApiError } from '@/lib/api/readApiError'

type VerifyResult = {
  matched: boolean
  valid_msg?: string
  status_label?: string
}

export function BusinessVerifyCard({
  companyName,
  onCompanyNameHint,
}: {
  companyName?: string
  onCompanyNameHint?: (name: string) => void
}) {
  const [bNo, setBNo] = useState('')
  const [startDt, setStartDt] = useState('')
  const [pNm, setPNm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<VerifyResult | null>(null)

  const handleVerify = async () => {
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await fetch('/api/profile/verify-business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'validate',
          b_no: bNo,
          start_dt: startDt,
          p_nm: pNm,
          b_nm: companyName || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(readApiError(data, '확인에 실패했습니다.'))
      setResult({
        matched: Boolean(data.matched),
        valid_msg: data.valid_msg,
        status_label: data.status_label,
      })
      if (data.matched && data.company_name_hint && onCompanyNameHint) {
        onCompanyNameHint(String(data.company_name_hint))
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '확인에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-emerald-950">
        <ShieldCheck className="h-4 w-4 text-emerald-600" />
        사업자등록 진위확인 (국세청)
      </div>
      <p className="text-xs text-emerald-900/80">
        번호·개업일·대표자명이 국세청 등록 정보와 일치하는지 확인합니다. 결과는 24시간 캐시됩니다.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">사업자등록번호</label>
          <input
            value={bNo}
            onChange={(e) => setBNo(e.target.value)}
            placeholder="0000000000"
            inputMode="numeric"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">개업일</label>
          <input
            value={startDt}
            onChange={(e) => setStartDt(e.target.value)}
            placeholder="YYYYMMDD"
            inputMode="numeric"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">대표자 성명</label>
          <input
            value={pNm}
            onChange={(e) => setPNm(e.target.value)}
            placeholder="홍길동"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>
      <button
        type="button"
        onClick={() => void handleVerify()}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        진위확인 실행
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {result && (
        <div
          className={`rounded-lg px-3 py-2 text-sm ${
            result.matched
              ? 'bg-white text-emerald-800 border border-emerald-200'
              : 'bg-amber-50 text-amber-900 border border-amber-200'
          }`}
        >
          {result.matched ? (
            <>
              <strong>일치</strong>
              {result.status_label ? ` · ${result.status_label}` : null}
            </>
          ) : (
            <>
              <strong>불일치</strong>
              {result.valid_msg ? ` — ${result.valid_msg}` : null}
            </>
          )}
        </div>
      )}
    </section>
  )
}
