'use client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { safeInternalNextPath } from '@/lib/auth/safeNextPath'
import { Loader2, LogIn } from 'lucide-react'
import { SITE_NAME } from '@/lib/site-config'
import SocialAuthButtons, { SocialAuthDivider } from '@/components/auth/SocialAuthButtons'

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  auth_callback_failed:
    '소셜 로그인 처리에 실패했습니다. 잠시 후 다시 시도하거나, Supabase에 /auth/callback URL이 등록되어 있는지 확인해 주세요.',
  oauth_denied: '소셜 로그인이 취소되었거나 거부되었습니다.',
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = safeInternalNextPath(searchParams.get('next'))
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const authError = searchParams.get('auth_error')
    if (authError && AUTH_ERROR_MESSAGES[authError]) {
      setError(AUTH_ERROR_MESSAGES[authError])
    }
  }, [searchParams])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const supabase = createClient()
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) { setError(err.message === 'Invalid login credentials' ? '이메일 또는 비밀번호가 올바르지 않습니다.' : err.message); setLoading(false); return }
    router.push(next)
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-black text-blue-600">{SITE_NAME}</Link>
          <p className="text-gray-500 text-sm mt-1">로그인하고 맞춤 지원사업을 찾아보세요</p>
        </div>

        <div className="bg-white rounded-2xl border p-8 shadow-sm">
          <h1 className="text-xl font-bold text-gray-900 mb-6">로그인</h1>
          <SocialAuthButtons nextPath={next} variant="login" />
          <SocialAuthDivider />
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">이메일</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="name@company.com"
                className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">비밀번호</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                placeholder="••••••••"
                className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

            <button type="submit" disabled={loading}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-gray-500">
              계정이 없으신가요?{' '}
              <Link href="/signup" className="text-blue-600 font-medium hover:underline">회원가입</Link>
            </p>
            <Link href="/reset-password" className="text-xs text-gray-400 hover:text-gray-600 block">비밀번호를 잊으셨나요?</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
