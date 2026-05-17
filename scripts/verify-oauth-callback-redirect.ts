/**
 * OAuth code URL 정리·교환 흐름 검증
 * 실행: npx tsx scripts/verify-oauth-callback-redirect.ts
 */
import { NextRequest } from 'next/server'
import { getPostOAuthRedirectUrl } from '@/lib/auth/oauthCodeExchange'
import { buildOAuthCallbackRedirect } from '@/lib/auth/oauthCallbackRedirect'

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg)
}

function req(url: string, method = 'GET') {
  return new NextRequest(new URL(url, 'http://localhost:3000'), { method })
}

function main() {
  const home = getPostOAuthRedirectUrl(
    req('http://localhost:3000/?code=0a613421-5e4e-44b0-b9a3-0864ac1a60d8')
  )
  assert(home.pathname === '/', 'home code stripped → /')
  assert(!home.searchParams.has('code'), 'no code in destination')

  const withNext = getPostOAuthRedirectUrl(
    req('http://localhost:3000/?code=x&next=/mypage')
  )
  assert(withNext.pathname === '/mypage', 'next param wins')

  const loginFail = buildOAuthCallbackRedirect(
    req('http://localhost:3000/login?error=auth_callback_failed')
  )
  assert(loginFail === null, 'login error param → no extra redirect')

  console.log('[verify-oauth-callback-redirect] PASS')
}

main()
