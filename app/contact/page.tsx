'use client'
import { useEffect, useState } from 'react'
import { Send, CheckCircle } from 'lucide-react'

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', category: '서비스 문의', message: '' })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const type = params.get('type')
    const categoryFromType =
      type === 'error'
        ? '오류 신고'
        : type === 'partnership'
          ? '제휴/컨설턴트 문의'
          : '서비스 문의'
    setForm((prev) => ({ ...prev, category: categoryFromType }))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.message) { alert('필수 항목을 입력하세요'); return }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(String(json.error ?? '문의 전송에 실패했습니다.'))
      }
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : '문의 전송에 실패했습니다.')
    }
    finally { setLoading(false) }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl border p-10 text-center max-w-md">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">문의가 접수되었습니다</h2>
          <p className="text-sm text-gray-500">영업일 기준 2~3일 이내에 이메일로 답변드리겠습니다.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <section className="bg-white border-b py-12">
        <div className="container mx-auto max-w-2xl px-4 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">고객센터</h1>
          <p className="text-gray-500">서비스 이용 중 문의사항을 남겨주세요</p>
        </div>
      </section>
      <div className="container mx-auto max-w-2xl px-4 py-10">
        <div className="bg-white rounded-xl border p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">이름 *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="홍길동" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">이메일 *</label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="name@company.com" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">문의 유형</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {['서비스 문의', '오류 신고', '제휴/컨설턴트 문의', '기능 제안', '기타'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">문의 내용 *</label>
              <textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} rows={6}
                placeholder="문의 내용을 상세히 작성해주세요." className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
              <Send className="h-4 w-4" />{loading ? '전송 중...' : '문의 전송'}
            </button>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </form>
        </div>
        <p className="text-xs text-center text-gray-400 mt-4">영업일 기준 2~3일 이내 이메일로 답변드립니다.</p>
      </div>
    </div>
  )
}
