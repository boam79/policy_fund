/**
 * 보안 회귀 검증 — CSRF·인증·레이트리밋·입력 검증
 * 실행: npm run verify:security
 */
/* eslint-disable no-console */

const BASE = process.env.VERIFY_BASE_URL ?? 'http://localhost:3000'

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg)
}

async function fetchJson(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, init)
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>
  return { status: res.status, json, headers: res.headers }
}

async function main() {
  console.log(`[verify-security] base=${BASE}`)

  // CSRF: 크로스 오리진 POST 차단 (billing confirm)
  const csrf = await fetchJson('/api/billing/confirm', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'https://evil.example',
    },
    body: JSON.stringify({ paymentKey: 'x', orderId: 'x', amount: 9900, plan: 'starter' }),
  })
  assert(csrf.status === 403, `CSRF expected 403, got ${csrf.status}`)

  // 문서 API: 미로그인 401 (미들웨어)
  const docAnon = await fetchJson('/api/documents/checklist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ announcementTitle: 't', announcementText: 'body' }),
  })
  assert(docAnon.status === 401, `documents anon expected 401, got ${docAnon.status}`)

  // export/user: 미로그인 401
  const exportAnon = await fetchJson('/api/export/user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rows: [{ a: 1 }] }),
  })
  assert(exportAnon.status === 401, `export anon expected 401, got ${exportAnon.status}`)

  // eligibility: 잘못된 program_id
  const badId = await fetchJson('/api/eligibility', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ program_id: 'not-a-uuid', profile: {} }),
  })
  assert(badId.status === 400, `eligibility bad uuid expected 400, got ${badId.status}`)

  // diagnosis session: 잘못된 id
  const badSid = await fetchJson('/api/diagnosis/session?id=not-uuid')
  assert(badSid.status === 400, `diagnosis bad id expected 400, got ${badSid.status}`)

  // billing confirm: 금액 불일치 (로그인 없으면 401 또는 CSRF 전 401 — Origin 없으면 CSRF 통과 가능)
  const badAmount = await fetchJson('/api/billing/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      paymentKey: 'pk_test',
      orderId: 'ord_test_1',
      amount: 1,
      plan: 'starter',
    }),
  })
  assert(
    [400, 401, 503].includes(badAmount.status),
    `billing bad amount expected 400/401/503, got ${badAmount.status}`
  )

  // 보안 헤더 (홈)
  const home = await fetch(`${BASE}/`)
  const csp = home.headers.get('content-security-policy')
  const xcto = home.headers.get('x-content-type-options')
  assert(Boolean(csp), 'CSP header missing')
  assert(xcto === 'nosniff', 'X-Content-Type-Options missing')

  console.log('[verify-security] PASS')
}

main().catch((e) => {
  console.error('[verify-security] FAIL', e)
  process.exit(1)
})
