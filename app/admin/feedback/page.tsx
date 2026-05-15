'use client'
import { useEffect, useState } from 'react'
import { Loader2, ThumbsUp, ThumbsDown, MessageSquare } from 'lucide-react'

interface FeedbackItem {
  id: string
  user_id: string | null
  target_type: string
  target_id: string | null
  rating: number
  feedback_text: string | null
  created_at: string
}

const TYPE_LABEL: Record<string, string> = {
  search: '검색 결과',
  eligibility: '자격판정',
  document: '문서 생성',
  evaluation: '점수 예측',
  general: '일반',
}

export default function AdminFeedbackPage() {
  const [items, setItems] = useState<FeedbackItem[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, positive: 0, negative: 0 })
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  const load = async (p = 1) => {
    setLoading(true)
    const res = await fetch(`/api/feedback?page=${p}`)
    const json = await res.json()
    setItems(json.data ?? [])
    setTotal(json.count ?? 0)
    const pos = (json.data ?? []).filter((f: FeedbackItem) => f.rating === 1).length
    setStats({ total: json.count ?? 0, positive: pos, negative: (json.data ?? []).length - pos })
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-blue-500" /></div>

  return (
    <div>
      <h1 className="text-xl font-bold text-white flex items-center gap-2 mb-6"><MessageSquare className="h-5 w-5 text-purple-400" />피드백 관리</h1>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <p className="text-xs text-gray-400 mb-1">전체 피드백</p>
          <p className="text-2xl font-bold text-white">{total}건</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <p className="text-xs text-gray-400 mb-1 flex items-center gap-1"><ThumbsUp className="h-3 w-3 text-green-400" />긍정</p>
          <p className="text-2xl font-bold text-green-400">{stats.positive}건</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <p className="text-xs text-gray-400 mb-1 flex items-center gap-1"><ThumbsDown className="h-3 w-3 text-red-400" />부정</p>
          <p className="text-2xl font-bold text-red-400">{stats.negative}건</p>
        </div>
      </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        {items.length === 0 ? (
          <div className="p-10 text-center text-gray-500">피드백이 없습니다</div>
        ) : (
          items.map(item => (
            <div key={item.id} className="flex items-start gap-4 px-5 py-4 border-b border-gray-700/50 hover:bg-gray-700/20">
              <div className={`mt-0.5 flex-shrink-0 ${item.rating === 1 ? 'text-green-400' : 'text-red-400'}`}>
                {item.rating === 1 ? <ThumbsUp className="h-4 w-4" /> : <ThumbsDown className="h-4 w-4" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">
                    {TYPE_LABEL[item.target_type] ?? item.target_type}
                  </span>
                  <span className="text-xs text-gray-500">{new Date(item.created_at).toLocaleDateString('ko-KR')}</span>
                </div>
                {item.feedback_text && <p className="text-sm text-gray-300">{item.feedback_text}</p>}
                {!item.feedback_text && <p className="text-sm text-gray-500 italic">텍스트 없음</p>}
              </div>
            </div>
          ))
        )}
      </div>

      {total > 30 && (
        <div className="flex justify-center gap-2 mt-4">
          <button onClick={() => { setPage(p => Math.max(1, p - 1)); load(page - 1) }} disabled={page === 1}
            className="px-3 py-1.5 text-sm text-gray-400 border border-gray-600 rounded-lg hover:bg-gray-700 disabled:opacity-30">이전</button>
          <span className="px-3 py-1.5 text-sm text-gray-300">{page} / {Math.ceil(total / 30)}</span>
          <button onClick={() => { setPage(p => p + 1); load(page + 1) }} disabled={page >= Math.ceil(total / 30)}
            className="px-3 py-1.5 text-sm text-gray-400 border border-gray-600 rounded-lg hover:bg-gray-700 disabled:opacity-30">다음</button>
        </div>
      )}
    </div>
  )
}
