/**
 * OAuth code가 홈 등에 붙으면 /auth/callback으로 보내는지 검증
 * 실행: tsx scripts/verify-oauth-callback-redirect.ts
 */
import { NextRequest } from 'next/server'
import { buildOAuthCallbackRedirect } from '@/lib/auth/oauthCallbackRedirect'

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg)
}

function req(url: string, method = 'GET') {
  return new NextRequest(new URL(url, 'http://localhost:3000'), { method })
}

function main() {
  const home = buildOAuthCallbackRedirect(
    req('http://localhost:3000/?code=0a613421-5e4e-44b0-b9a3-0864ac1a60d8')
  )
  assert(home?.pathname === '/auth/callback', 'home code → /auth/callback')
  assert(home?.searchParams.get('code') === '0a613421-5e4e-44b0-b9a3-0864ac1a60d8', 'code preserved')

  const already = buildOAuthCallbackRedirect(
    req('http://localhost:3000/auth/callback?code=abc&next=/mypage')
  )
  assert(already === null, 'already on callback → no redirect')

  const clean = buildOAuthCallbackRedirect(req('http://localhost:3000/search'))
  assert(clean === null, 'no oauth params → no redirect')

  const withNext = buildOAuthCallbackRedirect(
    req('http://localhost:3000/diagnosis?code=x&next=/manage')
  )
  assert(withNext?.pathname === '/auth/callback', 'diagnosis code → callback')
  assert(withNext?.searchParams.get('next') === '/manage', 'existing next preserved')

  console.log('[verify-oauth-callback-redirect] PASS')
}

main()
