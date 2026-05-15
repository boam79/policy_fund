'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Mail, CheckCircle } from 'lucide-react'
import { SITE_NAME } from '@/lib/site-config'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? location.origin}/auth/callback?next=/update-password`,
    })
    if (err) { setError(err.message); setLoading(false); return }
    setDone(true)
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border p-10 text-center max-w-md">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">메일을 확인하세요</h2>
          <p className="text-sm text-gray-500 mb-4"><strong>{email}</strong>으로 비밀번호 재설정 링크를 발송했습니다.</p>
          <Link href="/login" className="text-sm text-blue-600 hover:underline">로그인으로 돌아가기</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-black text-blue-600">{SITE_NAME}</Link>
        </div>
        <div className="bg-white rounded-2xl border p-8 shadow-sm">
          <h1 className="text-xl font-bold text-gray-900 mb-2">비밀번호 재설정</h1>
          <p className="text-sm text-gray-500 mb-6">가입한 이메일을 입력하면 재설정 링크를 발송합니다.</p>
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">이메일</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="name@company.com"
                className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              {loading ? '전송 중...' : '재설정 링크 전송'}
            </button>
          </form>
          <div className="mt-4 text-center">
            <Link href="/login" className="text-sm text-gray-400 hover:text-gray-600">← 로그인으로 돌아가기</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
