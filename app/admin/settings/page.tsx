'use client'

import { useState, useEffect } from 'react'
import { Loader2, Save } from 'lucide-react'
import { readApiError } from '@/lib/api/readApiError'

export default function AdminSettingsPage() {
  const [dataMode, setDataMode] = useState('api_minimal_cache')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      setError('')
      try {
        const res = await fetch('/api/admin/system-settings')
        const j = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(readApiError(j, '설정을 불러오지 못했습니다.'))
        if (typeof j.data_mode === 'string') setDataMode(j.data_mode)
      } catch (e) {
        setError(e instanceof Error ? e.message : '설정을 불러오지 못했습니다.')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/admin/system-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data_mode: dataMode }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(readApiError(j, '저장에 실패했습니다.'))
      if (typeof j.data_mode === 'string') setDataMode(j.data_mode)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">운영 설정</h1>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
        </div>
      ) : (
        <div className="max-w-xl space-y-6">
          <div className="bg-white rounded-xl border p-5">
            <h2 className="font-semibold text-gray-900 mb-1">데이터 운영 모드</h2>
            <p className="text-xs text-gray-500 mb-4">공고 검색 데이터 소스를 선택합니다.</p>
            <div className="space-y-2">
              {[
                { value: 'api_minimal_cache', label: 'API 최소 캐시 (현재)', desc: '공공 API 조회 + Supabase 최소 저장. 무료 플랜 권장.' },
                { value: 'db_centric', label: 'DB 중심 (유료 전환 후)', desc: '전체 공고를 DB에 저장 후 검색. Supabase 용량 증가.' },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    dataMode === opt.value ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="dataMode"
                    value={opt.value}
                    checked={dataMode === opt.value}
                    onChange={(e) => setDataMode(e.target.value)}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{opt.label}</p>
                    <p className="text-xs text-gray-500">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <p className="text-sm font-medium text-yellow-800 mb-1">Vercel Pro 전환 시</p>
            <p className="text-xs text-yellow-700">
              <code className="bg-yellow-100 px-1 rounded">docs/upgrade-to-pro.md</code>를 참고해 vercel.json에 crons 추가 후 launchd를 비활성화하세요.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            저장
          </button>
          {saved && <p className="text-sm text-green-600">✓ 저장되었습니다</p>}
        </div>
      )}
    </div>
  )
}
