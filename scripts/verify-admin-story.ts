/* eslint-disable no-console */
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
  const adminPages = ['/admin', '/admin/users', '/admin/dashboard', '/admin/inquiries']
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
  ]
  for (const api of blockedAdminApis) {
    const res = await requestJson(api)
    assert([401, 403].includes(res.status), `Admin API must be blocked: ${api} (got ${res.status})`)
  }

  // 3) Admin sync endpoint should reject requests without secret/session.
  const syncRes = await requestJson('/api/admin/sync', { method: 'POST' })
  assert([401, 403].includes(syncRes.status), `Admin sync should reject unauth request (got ${syncRes.status})`)

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

  console.log('[verify-admin] PASS')
}

run().catch((err) => {
  console.error('[verify-admin] FAIL', err instanceof Error ? err.message : err)
  process.exit(1)
})
