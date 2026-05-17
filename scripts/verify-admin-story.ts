 
export {}
type Json = Record<string, unknown>

const BASE_URL = process.env.STORY_BASE_URL ?? 'http://localhost:3000'

async function requestJson(
  path: string,
  init?: RequestInit
): Promise<{ status: number; json: Json; headers: Headers }> {
  const res = await fetch(`${BASE_URL}${path}`, init)
  const text = await res.text()
  let json: Json = {}
  try {
    json = text ? (JSON.parse(text) as Json) : {}
  } catch {
    json = { raw: text }
  }
  return { status: res.status, json, headers: res.headers }
}

async function requestRaw(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${BASE_URL}${path}`, init)
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

async function run() {
  console.log(`[verify-admin] base=${BASE_URL}`)

  // 1) Admin pages should not be reachable without login/admin role.
  const adminPages = [
    '/admin',
    '/admin/dashboard',
    '/admin/programs',
    '/admin/sync',
    '/admin/recommendations',
    '/admin/users',
    '/admin/inquiries',
    '/admin/feedback',
    '/admin/billing',
    '/admin/settings',
  ]
  for (const page of adminPages) {
    const res = await requestRaw(page, { redirect: 'manual' })
    assert(
      [301, 302, 303, 307, 308].includes(res.status),
      `Admin page must redirect when unauthenticated: ${page} (got ${res.status})`
    )
    const location = res.headers.get('location') ?? ''
    assert(
      location.includes('/login') || location.includes('?error=admin_only') || location === '/',
      `Unexpected admin redirect location for ${page}: ${location}`
    )
  }

  // 2) Admin APIs should be blocked without admin session.
  const blockedAdminApis = [
    '/api/admin/users',
    '/api/admin/dashboard',
    '/api/admin/billing',
    '/api/admin/recommendations/home-slots',
    '/api/admin/inquiries',
    '/api/admin/sync-logs',
    '/api/admin/programs',
    '/api/admin/programs/quality',
    '/api/admin/programs/duplicates',
    '/api/admin/nav-badges',
    '/api/admin/system-settings',
  ]
  for (const api of blockedAdminApis) {
    const res = await requestJson(api)
    assert([401, 403].includes(res.status), `Admin API must be blocked: ${api} (got ${res.status})`)
  }

  // 3) Admin sync endpoint should reject requests without secret/session.
  const syncRes = await requestJson('/api/admin/sync', { method: 'POST' })
  assert([401, 403].includes(syncRes.status), `Admin sync should reject unauth request (got ${syncRes.status})`)

  const syncCsrf = await requestJson('/api/admin/sync', {
    method: 'POST',
    headers: { Origin: 'https://evil.example' },
  })
  assert(syncCsrf.status === 403, `Admin sync CSRF expected 403 (got ${syncCsrf.status})`)

  // 4) Export APIs should remain blocked for non-admin users.
  const exportCsv = await requestJson('/api/export/csv', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'programs' }),
  })
  assert([401, 403].includes(exportCsv.status), `Export CSV must be blocked (got ${exportCsv.status})`)

  const exportXlsx = await requestJson('/api/export/xlsx', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'programs' }),
  })
  assert([401, 403].includes(exportXlsx.status), `Export XLSX must be blocked (got ${exportXlsx.status})`)

  // 5) 선택: 브라우저 개발자도구(Network)에서 관리자로 로그인한 뒤 아무 /api/admin/* 요청의
  //    Request Headers > Cookie 값 전체를 복사해 환경변수 ADMIN_VERIFY_COOKIE에 넣으면
  //    동일 쿠키로 대시보드·결제·회원 API를 추가 검증합니다. (.env.local 전용, 커밋 금지)
  const adminCookie = process.env.ADMIN_VERIFY_COOKIE?.trim()
  if (adminCookie) {
    const dash = await requestJson('/api/admin/dashboard', {
      headers: { Cookie: adminCookie },
    })
    assert(dash.status === 200, `Admin dashboard with cookie expected 200 (got ${dash.status})`)
    assert(dash.json && (dash.json as { ok?: boolean }).ok === true, 'Admin dashboard JSON should include ok:true')

    const bill = await requestJson('/api/admin/billing', { headers: { Cookie: adminCookie } })
    assert(bill.status === 200, `Admin billing with cookie expected 200 (got ${bill.status})`)

    const users = await requestJson('/api/admin/users', { headers: { Cookie: adminCookie } })
    assert(users.status === 200, `Admin users with cookie expected 200 (got ${users.status})`)

    console.log('[verify-admin] PASS (including ADMIN_VERIFY_COOKIE simulation)')
  } else {
    console.log('[verify-admin] PASS (set ADMIN_VERIFY_COOKIE to also hit /api/admin/* as logged-in admin)')
  }
}

run().catch((err) => {
  console.error('[verify-admin] FAIL', err instanceof Error ? err.message : err)
  process.exit(1)
})
