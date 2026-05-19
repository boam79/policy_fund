'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell, Loader2, Save, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { readApiError } from '@/lib/api/readApiError'
import { SITE_NAME } from '@/lib/site-config'
import { normalizeProgramSourceList, PROGRAM_SOURCES, PROGRAM_SOURCE_LABEL } from '@/lib/gov-support/programSources'
import { PROVINCE_OPTIONS } from '@/lib/geo/regions'
import { INDUSTRY_FILTER_OPTIONS } from '@/lib/industry/options'

const REGIONS = PROVINCE_OPTIONS
const INDUSTRIES = INDUSTRY_FILTER_OPTIONS
const SOURCES = PROGRAM_SOURCES.filter((id) => id !== 'manual').map((id) => ({
  id,
  label: PROGRAM_SOURCE_LABEL[id] ?? id,
}))

function toggleInList(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((x) => x !== value) : [...list, value]
}

export default function MyPageAlertsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [regions, setRegions] = useState<string[]>([])
  const [industries, setIndustries] = useState<string[]>([])
  const [sources, setSources] = useState<string[]>([])
  const [keywords, setKeywords] = useState('')
  const [notifyDays, setNotifyDays] = useState(7)
  const [notifyNew, setNotifyNew] = useState(true)

  useEffect(() => {
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      try {
        const res = await fetch('/api/alerts/profile')
        const data = await res.json()
        if (!res.ok) throw new Error(readApiError(data, '불러오기 실패'))
        const p = data.profile
        if (p) {
          setIsActive(p.is_active !== false)
          setRegions(p.regions ?? [])
          setIndustries(p.industries ?? [])
          setSources(normalizeProgramSourceList((p.sources ?? []) as string[]))
          setKeywords((p.keywords ?? []).join(', '))
          setNotifyDays(Number(p.notify_days_before) || 7)
          setNotifyNew(p.notify_new_programs !== false)
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : '오류')
      } finally {
        setLoading(false)
      }
    })()
  }, [router, supabase])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    setError('')
    try {
      const res = await fetch('/api/alerts/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_active: isActive,
          regions,
          industries,
          sources: normalizeProgramSourceList(sources),
          keywords: keywords
            .split(/[,，]/)
            .map((k) => k.trim())
            .filter(Boolean),
          notify_days_before: notifyDays,
          notify_new_programs: notifyNew,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(readApiError(data, '저장 실패'))
      setSaved(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장 실패')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Link href="/mypage" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-4">
          <ArrowLeft className="h-4 w-4" />
          마이페이지
        </Link>
        <div className="flex items-center gap-2 mb-2">
          <Bell className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">공고 알림</h1>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          {SITE_NAME}에서 조건에 맞는 공고가 마감 임박하거나 신규 등록되면 이메일로 안내합니다(일 1회 배치).
        </p>

        <div className="bg-white rounded-xl border p-6 space-y-6">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            알림 사용
          </label>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-gray-800">지역 (비우면 전체)</legend>
            <div className="flex flex-wrap gap-2">
              {REGIONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRegions((prev) => toggleInList(prev, r))}
                  className={`px-2 py-1 rounded-full text-xs border ${
                    regions.includes(r) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-gray-800">업종</legend>
            <div className="flex flex-wrap gap-2">
              {INDUSTRIES.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIndustries((prev) => toggleInList(prev, i))}
                  className={`px-2 py-1 rounded-full text-xs border ${
                    industries.includes(i) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600'
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-gray-800">출처</legend>
            <div className="flex flex-wrap gap-2">
              {SOURCES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSources((prev) => toggleInList(prev, s.id))}
                  className={`px-2 py-1 rounded-full text-xs border ${
                    sources.includes(s.id) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </fieldset>

          <div>
            <label className="text-sm font-medium text-gray-800 block mb-1">키워드 (쉼표 구분)</label>
            <input
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="예: R&D, 바우처"
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-800 block mb-1">마감 D-N 알림</label>
              <select
                value={notifyDays}
                onChange={(e) => setNotifyDays(Number(e.target.value))}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                {[3, 7, 14, 30].map((d) => (
                  <option key={d} value={d}>
                    D-{d} 이내
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-end gap-2 text-sm pb-2">
              <input type="checkbox" checked={notifyNew} onChange={(e) => setNotifyNew(e.target.checked)} />
              최근 24시간 신규 공고 포함
            </label>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {saved && <p className="text-sm text-green-600">저장되었습니다.</p>}

          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            저장
          </button>
        </div>
      </div>
    </div>
  )
}
