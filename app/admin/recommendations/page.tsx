'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2, Eye, EyeOff, Loader2, Star } from 'lucide-react'
import type { Database } from '@/types/database.types'
import { readApiError } from '@/lib/api/readApiError'
import { AdminOpsPageShell } from '@/components/admin/AdminOpsPageShell'

type Slot = Database['public']['Tables']['home_recommendation_slots']['Row'] & {
  program?: { title: string } | null
}

const SLOT_TYPE_LABEL: Record<string, string> = {
  featured: '특집 배너',
  closing_soon: '마감임박',
  new: '신규',
  manual: '수동 등록',
}

export default function RecommendationsPage() {
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [programQuery, setProgramQuery] = useState('')
  const [searchResults, setSearchResults] = useState<{ id: string; title: string }[]>([])
  const [adding, setAdding] = useState(false)

  const loadSlots = async () => {
    setLoadError('')
    try {
      const res = await fetch('/api/admin/recommendations/home-slots')
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setLoadError(readApiError(data, '슬롯 목록을 불러오지 못했습니다.'))
        setSlots([])
        return
      }
      setSlots(Array.isArray(data) ? (data as Slot[]) : [])
    } catch {
      setLoadError('슬롯 목록을 불러오지 못했습니다.')
      setSlots([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadSlots()
  }, [])

  const searchPrograms = async (q: string) => {
    if (q.length < 2) {
      setSearchResults([])
      return
    }
    try {
      const res = await fetch(`/api/admin/programs?q=${encodeURIComponent(q)}&limit=5&page=1`)
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        setSearchResults([])
        return
      }
      setSearchResults(
        ((j.programs ?? []) as { id: string; title: string }[]).map((p) => ({ id: p.id, title: p.title }))
      )
    } catch {
      setSearchResults([])
    }
  }

  const toggleActive = async (id: string, current: boolean) => {
    const res = await fetch('/api/admin/recommendations/home-slots', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_active: !current }),
    })
    if (!res.ok) return
    setSlots((s) => s.map((sl) => (sl.id === id ? { ...sl, is_active: !current } : sl)))
  }

  const deleteSlot = async (id: string) => {
    if (!confirm('삭제하시겠습니까?')) return
    const res = await fetch(`/api/admin/recommendations/home-slots?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    if (!res.ok) return
    setSlots((s) => s.filter((sl) => sl.id !== id))
  }

  const addSlot = async (programId: string, title: string) => {
    setAdding(true)
    try {
      const maxPriority = slots.reduce((max, s) => Math.max(max, s.priority ?? 0), 0)
      const res = await fetch('/api/admin/recommendations/home-slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          program_id: programId,
          display_title: title,
          slot_type: 'manual',
          priority: maxPriority + 1,
          is_active: true,
        }),
      })
      if (!res.ok) return
      setProgramQuery('')
      setSearchResults([])
      await loadSlots()
    } finally {
      setAdding(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 p-6">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <AdminOpsPageShell>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            홈 배너 슬롯 관리
          </h1>
          <p className="text-sm text-gray-500 mt-1">홈 화면 추천 배너에 노출할 공고를 관리합니다</p>
        </div>
      </div>

      {loadError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{loadError}</div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 relative shadow-sm">
        <p className="text-sm text-gray-700 mb-2 font-medium">공고 직접 추가</p>
        <div className="flex gap-2">
          <input
            value={programQuery}
            onChange={(e) => {
              setProgramQuery(e.target.value)
              void searchPrograms(e.target.value)
            }}
            placeholder="공고명 검색..."
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {searchResults.length > 0 && (
          <div className="absolute left-4 right-4 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-10">
            {searchResults.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => void addSlot(p.id, p.title)}
                disabled={adding}
                className="w-full flex items-center gap-2 px-4 py-3 hover:bg-gray-50 text-left text-sm text-gray-900 border-b border-gray-100 last:border-0 transition-colors"
              >
                <Plus className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                {p.title}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="px-5 py-3 border-b border-gray-100">
          <p className="text-sm text-gray-600">총 {slots.length}개 슬롯</p>
        </div>
        {slots.length === 0 ? (
          <div className="p-10 text-center text-gray-500">등록된 슬롯이 없습니다</div>
        ) : (
          slots.map((slot) => (
            <div
              key={slot.id}
              className={`flex items-center justify-between px-5 py-4 border-b border-gray-100 last:border-0 ${
                !slot.is_active ? 'opacity-50' : ''
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {slot.display_title ?? slot.program?.title ?? '(제목 없음)'}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                    {SLOT_TYPE_LABEL[slot.slot_type ?? 'manual'] ?? slot.slot_type}
                  </span>
                  <span className="text-xs text-gray-500">우선순위: {slot.priority}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <button
                  type="button"
                  onClick={() => void toggleActive(slot.id, slot.is_active ?? true)}
                  className={`p-2 rounded-lg transition-colors ${
                    slot.is_active ? 'text-green-600 hover:bg-green-50' : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {slot.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => void deleteSlot(slot.id)}
                  className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </AdminOpsPageShell>
  )
}
