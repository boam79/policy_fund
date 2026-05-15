'use client'
import { useState, useEffect } from 'react'
import { Loader2, Save } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

export default function AdminSettingsPage() {
  const [dataMode, setDataMode] = useState('api_minimal_cache')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    supabase.from('system_settings').select('setting_value').eq('setting_key', 'data_mode').single()
      .then(({ data }) => { if (data?.setting_value) setDataMode(data.setting_value as string); setLoading(false) })
  }, [])

  const handleSave = async () => {
    setSaving(true)
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    await supabase.from('system_settings').upsert({ setting_key: 'data_mode', setting_value: dataMode })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">운영 설정</h1>

      {loading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="h-6 w-6 animate-spin text-blue-500" /></div>
      ) : (
        <div className="max-w-xl space-y-6">
          {/* 데이터 모드 */}
          <div className="bg-white rounded-xl border p-5">
            <h2 className="font-semibold text-gray-900 mb-1">데이터 운영 모드</h2>
            <p className="text-xs text-gray-500 mb-4">공고 검색 데이터 소스를 선택합니다.</p>
            <div className="space-y-2">
              {[
                { value: 'api_minimal_cache', label: 'API 최소 캐시 (현재)', desc: '공공 API 조회 + Supabase 최소 저장. 무료 플랜 권장.' },
                { value: 'db_centric', label: 'DB 중심 (유료 전환 후)', desc: '전체 공고를 DB에 저장 후 검색. Supabase 용량 증가.' },
              ].map(opt => (
                <label key={opt.value} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${dataMode === opt.value ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'}`}>
                  <input type="radio" name="dataMode" value={opt.value} checked={dataMode === opt.value} onChange={e => setDataMode(e.target.value)} className="mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{opt.label}</p>
                    <p className="text-xs text-gray-500">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Vercel Pro 전환 안내 */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <p className="text-sm font-medium text-yellow-800 mb-1">Vercel Pro 전환 시</p>
            <p className="text-xs text-yellow-700">
              <code className="bg-yellow-100 px-1 rounded">docs/upgrade-to-pro.md</code>를 참고해 vercel.json에 crons 추가 후 launchd를 비활성화하세요.
            </p>
          </div>

          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            저장
          </button>
          {saved && <p className="text-sm text-green-600">✓ 저장되었습니다</p>}
        </div>
      )}
    </div>
  )
}
