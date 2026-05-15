'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Loader2, UserPlus, CheckCircle } from 'lucide-react'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [resendNotice, setResendNotice] = useState('')
  const [existingAccount, setExistingAccount] = useState(false)
  const [done, setDone] = useState(false)
  const getRedirectUrl = () => {
    if (process.env.NEXT_PUBLIC_APP_URL) return `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`
    if (typeof window !== 'undefined') return `${window.location.origin}/auth/callback`
    return '/auth/callback'
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setNotice('')
    if (password !== confirm) { setError('비밀번호가 일치하지 않습니다.'); return }
    if (password.length < 8) { setError('비밀번호는 8자 이상이어야 합니다.'); return }
    setLoading(true)
    const supabase = createClient()
    const { data, error: err } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: getRedirectUrl() },
    })
    if (err) { setError(err.message); setLoading(false); return }
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      setExistingAccount(true)
      setNotice('이미 가입된 계정입니다. 로그인하거나 비밀번호 재설정으로 진행해주세요.')
    }
    setDone(true)
    setLoading(false)
  }

  const handleResend = async () => {
    setResendLoading(true)
    setResendNotice('')
    const supabase = createClient()
    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: getRedirectUrl() },
    })
    if (resendError) {
      setResendNotice(`재전송 실패: ${resendError.message}`)
      setResendLoading(false)
      return
    }
    setResendNotice('인증 메일을 다시 보냈습니다. 받은편지함/스팸함을 확인해주세요.')
    setResendLoading(false)
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border p-10 text-center max-w-md shadow-sm">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">이메일을 확인하세요</h2>
          <p className="text-sm text-gray-500 mb-4">
            {existingAccount ? (
              <>
                <strong>{email}</strong>은 이미 가입된 계정으로 확인되었습니다.<br />
                아래 안내에 따라 로그인 또는 비밀번호 재설정을 진행해주세요.
              </>
            ) : (
              <>
                <strong>{email}</strong>로 인증 메일을 발송했습니다.<br />
                메일의 링크를 클릭하면 가입이 완료됩니다.
              </>
            )}
          </p>
          {notice && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mb-3">
              {notice}
            </p>
          )}
          {!existingAccount && (
            <button
              type="button"
              onClick={handleResend}
              disabled={resendLoading}
              className="w-full mb-3 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {resendLoading ? '재전송 중...' : '인증 메일 다시 보내기'}
            </button>
          )}
          {resendNotice && (
            <p className="text-xs text-gray-600 bg-gray-50 border rounded-md px-3 py-2 mb-3">
              {resendNotice}
            </p>
          )}
          {existingAccount && (
            <Link href="/reset-password" className="block text-sm text-gray-600 hover:underline mb-3">
              비밀번호 재설정 메일 보내기
            </Link>
          )}
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
