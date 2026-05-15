'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Plus, Trash2, Eye, EyeOff, Loader2, Star } from 'lucide-react'
import type { Database } from '@/types/database.types'

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
  const [programQuery, setProgramQuery] = useState('')
  const [searchResults, setSearchResults] = useState<{ id: string; title: string }[]>([])
  const [adding, setAdding] = useState(false)

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const loadSlots = async () => {
    const { data } = await supabase
      .from('home_recommendation_slots')
      .select('*, program:support_programs(title)')
      .order('priority', { ascending: true })
    setSlots((data ?? []) as Slot[])
    setLoading(false)
  }

  useEffect(() => { loadSlots() }, [])

  const searchPrograms = async (q: string) => {
    if (q.length < 2) { setSearchResults([]); return }
    const { data } = await supabase
      .from('support_programs')
      .select('id,title')
      .ilike('title', `%${q}%`)
      .limit(5)
    setSearchResults(data ?? [])
  }

  const toggleActive = async (id: string, current: boolean) => {
    await fetch('/api/admin/recommendations/home-slots', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_active: !current }),
    })
    setSlots(s => s.map(sl => sl.id === id ? { ...sl, is_active: !current } : sl))
  }

  const deleteSlot = async (id: string) => {
    if (!confirm('삭제하시겠습니까?')) return
    await supabase.from('home_recommendation_slots').delete().eq('id', id)
    setSlots(s => s.filter(sl => sl.id !== id))
  }

  const addSlot = async (programId: string, title: string) => {
    setAdding(true)
    const maxPriority = slots.reduce((max, s) => Math.max(max, s.priority ?? 0), 0)
    await supabase.from('home_recommendation_slots').insert({
      program_id: programId,
      slot_type: 'manual',
      display_title: title,
      priority: maxPriority + 1,
      is_active: true,
    })
    setProgramQuery('')
    setSearchResults([])
    await loadSlots()
    setAdding(false)
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-blue-500" /></div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2"><Star className="h-5 w-5 text-yellow-400" />홈 배너 슬롯 관리</h1>
          <p className="text-sm text-gray-400 mt-1">홈 화면 추천 배너에 노출할 공고를 관리합니다</p>
        </div>
      </div>

      {/* 공고 검색 추가 */}
      <div className="bg-gray-800 rounded-xl p-4 mb-6 relative">
        <p className="text-sm text-gray-300 mb-2 font-medium">공고 직접 추가</p>
        <div className="flex gap-2">
          <input value={programQuery} onChange={e => { setProgramQuery(e.target.value); searchPrograms(e.target.value) }}
            placeholder="공고명 검색..."
            className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500" />
        </div>
        {searchResults.length > 0 && (
          <div className="absolute left-4 right-4 top-full mt-1 bg-gray-700 border border-gray-600 rounded-lg shadow-xl z-10">
            {searchResults.map(p => (
              <button key={p.id} onClick={() => addSlot(p.id, p.title)} disabled={adding}
                className="w-full flex items-center gap-2 px-4 py-3 hover:bg-gray-600 text-left text-sm text-white border-b border-gray-600 last:border-0 transition-colors">
                <Plus className="h-3.5 w-3.5 text-green-400 flex-shrink-0" />
                {p.title}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 슬롯 목록 */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-700">
          <p className="text-sm text-gray-300">총 {slots.length}개 슬롯</p>
        </div>
        {slots.length === 0 ? (
          <div className="p-10 text-center text-gray-500">등록된 슬롯이 없습니다</div>
        ) : (
          slots.map(slot => (
            <div key={slot.id} className={`flex items-center justify-between px-5 py-4 border-b border-gray-700 last:border-0 ${!slot.is_active ? 'opacity-50' : ''}`}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{slot.display_title ?? (slot as Slot).program?.title ?? '(제목 없음)'}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-400 bg-gray-700 px-2 py-0.5 rounded">{SLOT_TYPE_LABEL[slot.slot_type ?? 'manual'] ?? slot.slot_type}</span>
                  <span className="text-xs text-gray-500">우선순위: {slot.priority}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <button onClick={() => toggleActive(slot.id, slot.is_active ?? true)}
                  className={`p-2 rounded-lg transition-colors ${slot.is_active ? 'text-green-400 hover:bg-green-900/30' : 'text-gray-500 hover:bg-gray-700'}`}>
                  {slot.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
                <button onClick={() => deleteSlot(slot.id)} className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-900/30 rounded-lg transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
