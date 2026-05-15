'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Loader2, UserPlus, CheckCircle } from 'lucide-react'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('비밀번호가 일치하지 않습니다.'); return }
    if (password.length < 8) { setError('비밀번호는 8자 이상이어야 합니다.'); return }
    setLoading(true)
    const supabase = createClient()
    const { error: err } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    })
    if (err) { setError(err.message); setLoading(false); return }
    setDone(true)
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border p-10 text-center max-w-md shadow-sm">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">이메일을 확인하세요</h2>
          <p className="text-sm text-gray-500 mb-4">
            <strong>{email}</strong>로 인증 메일을 발송했습니다.<br />
            메일의 링크를 클릭하면 가입이 완료됩니다.
          </p>
          <Link href="/login" className="text-sm text-blue-600 hover:underline">로그인 페이지로</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-black text-blue-600">PolicyFund AI</Link>
          <p className="text-gray-500 text-sm mt-1">무료로 가입하고 지원사업을 찾아보세요</p>
        </div>

        <div className="bg-white rounded-2xl border p-8 shadow-sm">
          <h1 className="text-xl font-bold text-gray-900 mb-6">회원가입</h1>
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">이메일</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="name@company.com"
                className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">비밀번호 <span className="text-gray-400 font-normal">(8자 이상)</span></label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                placeholder="••••••••"
                className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">비밀번호 확인</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required
                placeholder="••••••••"
                className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

            <button type="submit" disabled={loading}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              {loading ? '가입 중...' : '가입하기'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              이미 계정이 있으신가요?{' '}
              <Link href="/login" className="text-blue-600 font-medium hover:underline">로그인</Link>
            </p>
          </div>
          <p className="text-xs text-gray-400 text-center mt-4">
            가입 시 <Link href="/terms" className="underline">이용약관</Link> 및{' '}
            <Link href="/privacy" className="underline">개인정보처리방침</Link>에 동의합니다.
          </p>
        </div>
      </div>
    </div>
  )
}
