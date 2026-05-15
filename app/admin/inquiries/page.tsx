'use client'
import { useEffect, useState } from 'react'
import { Loader2, MessageSquare } from 'lucide-react'
import { readApiError } from '@/lib/api/readApiError'

interface Inquiry { id: string; name: string; email: string; inquiry_type: string; subject: string; message: string; status: string; created_at: string }

const STATUS_COLOR: Record<string, string> = {
  received: 'bg-red-100 text-red-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  resolved: 'bg-blue-100 text-blue-700',
  closed: 'bg-gray-100 text-gray-600',
}
const STATUS_LABEL: Record<string, string> = {
  received: '접수됨',
  in_progress: '처리중',
  resolved: '답변완료',
  closed: '종료',
}

export default function AdminInquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Inquiry | null>(null)
  const [error, setError] = useState('')

  const loadInquiries = async () => {
    try {
      setLoading(true)
      setError('')
      const res = await fetch('/api/admin/inquiries')
      const json = await res.json()
      if (!res.ok) throw new Error(readApiError(json, '문의 데이터를 불러오지 못했습니다.'))
      setInquiries((json.inquiries ?? []) as Inquiry[])
    } catch (err) {
      setInquiries([])
      setError(err instanceof Error ? err.message : '문의 데이터를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadInquiries()
  }, [])

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch('/api/admin/inquiries', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(readApiError(json, '상태 변경에 실패했습니다.'))
      setInquiries((is) => is.map((i) => (i.id === id ? { ...i, status } : i)))
      if (selected?.id === id) setSelected((s) => (s ? { ...s, status } : null))
    } catch (err) {
      setError(err instanceof Error ? err.message : '상태 변경에 실패했습니다.')
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">문의 관리</h1>
      {error && (
        <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      {loading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="h-6 w-6 animate-spin text-blue-500" /></div>
      ) : (
        <div className="flex gap-4">
          {/* 목록 */}
          <div className="flex-1 bg-white rounded-xl border overflow-hidden">
            {inquiries.length === 0 ? (
              <div className="p-12 text-center text-gray-400"><MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />문의 없음</div>
            ) : (
              inquiries.map(inq => (
                <button key={inq.id} onClick={() => setSelected(inq)}
                  className={`w-full text-left p-4 border-b hover:bg-gray-50 transition-colors ${selected?.id === inq.id ? 'bg-blue-50' : ''}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">{inq.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLOR[inq.status] ?? 'bg-gray-100 text-gray-600'}`}>{STATUS_LABEL[inq.status] ?? inq.status}</span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">{inq.subject}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{new Date(inq.created_at).toLocaleDateString('ko-KR')}</p>
                </button>
              ))
            )}
          </div>

          {/* 상세 */}
          {selected && (
            <div className="w-96 bg-white rounded-xl border p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">문의 상세</h2>
                <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-sm">닫기</button>
              </div>
              <div className="space-y-3 text-sm">
                <div><p className="text-xs text-gray-400">이름</p><p className="text-gray-900">{selected.name}</p></div>
                <div><p className="text-xs text-gray-400">이메일</p><p className="text-gray-900">{selected.email}</p></div>
                <div><p className="text-xs text-gray-400">유형</p><p className="text-gray-900">{selected.inquiry_type}</p></div>
                <div><p className="text-xs text-gray-400">내용</p><p className="text-gray-700 leading-relaxed">{selected.message}</p></div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">상태 변경</p>
                  <div className="flex gap-2">
                    {Object.entries(STATUS_LABEL).map(([k, v]) => (
                      <button key={k} onClick={() => updateStatus(selected.id, k)}
                        className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${selected.status === k ? 'bg-blue-600 text-white border-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}>
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
