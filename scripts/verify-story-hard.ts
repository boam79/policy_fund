#!/usr/bin/env tsx
/**
 * 확장 유저·관리자 스토리 검증 (페이지 + 데이터 품질)
 * 실행: npm run verify:hard
 */
/* eslint-disable no-console */
export {}

type Json = Record<string, unknown>

const BASE = process.env.STORY_BASE_URL ?? 'http://localhost:3000'

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg)
}

async function fetchJson(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, init)
  const text = await res.text()
  let json: Json = {}
  try {
    json = text ? (JSON.parse(text) as Json) : {}
  } catch {
    json = { raw: text }
  }
  return { res, json, text }
}

async function fetchPage(path: string) {
  const res = await fetch(`${BASE}${path}`, { redirect: 'manual' })
  const text = await res.text()
  return { status: res.status, text, location: res.headers.get('location') }
}

function hasRawHtmlLeak(s: string): boolean {
  return /<p[\s>]/i.test(s) || /<br\s*\/?>/i.test(s) || /&nbsp;/i.test(s)
}

async function run() {
  console.log(`[verify-hard] base=${BASE}`)

  // ── 공개 페이지 ──
  for (const p of ['/', '/search', '/diagnosis', '/guide', '/documents/plan', '/login']) {
    const { status } = await fetchPage(p)
    assert(status === 200, `Public page ${p} expected 200, got ${status}`)
  }

  // ── US: 검색 결과 HTML 오염 없음 ──
  const search = await fetchJson('/api/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ region: '경기', industry: '제조업', page: 1, limit: 10 }),
  })
  assert(search.res.status === 200 && search.json.ok === true, 'Search API should return ok')
  const programs = (search.json.programs as Json[] | undefined) ?? []
  assert(programs.length > 0, 'Search should return programs for 경기+제조업')
  for (const p of programs.slice(0, 5)) {
    const title = String(p.title ?? '')
    const st = String(p.support_type ?? '')
    assert(!hasRawHtmlLeak(title), `HTML leak in title: ${title.slice(0, 80)}`)
    if (st) assert(!hasRawHtmlLeak(st), `HTML leak in support_type: ${st.slice(0, 80)}`)
  }

  // ── US: 긴 자연어 키워드 검색 (폴백 경로) ──
  const kwSearch = await fetchJson('/api/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      keyword: '경기도 제조업 지원사업',
      page: 1,
      limit: 5,
    }),
  })
  assert(kwSearch.res.status === 200, 'Keyword search should 200')

  // ── Admin 페이지: 미인증 리다이렉트 ──
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
  for (const p of adminPages) {
    const { status, location } = await fetchPage(p)
    assert(
      [301, 302, 303, 307, 308].includes(status),
      `Admin page must redirect: ${p} (got ${status})`
    )
    const loc = location ?? ''
    assert(
      loc.includes('/login') || loc.includes('admin_only') || loc === '/',
      `Unexpected redirect for ${p}: ${loc}`
    )
  }

  // ── Admin API 차단 ──
  const adminApis = [
    '/api/admin/dashboard',
    '/api/admin/programs',
    '/api/admin/programs?page=1',
    '/api/admin/sync-logs',
    '/api/admin/system-settings',
    '/api/admin/users',
    '/api/admin/inquiries',
    '/api/admin/billing',
    '/api/admin/recommendations/home-slots',
    '/api/feedback?page=1',
  ]
  for (const api of adminApis) {
    const { res } = await fetchJson(api)
    assert([401, 403].includes(res.status), `Admin API blocked: ${api} (got ${res.status})`)
  }

  // ── 홈 추천 API ──
  const rec = await fetchJson('/api/home/recommendations')
  assert(rec.res.status === 200, 'Home recommendations 200')
  const recData = (rec.json.data as Json[] | undefined) ?? []
  for (const item of recData.slice(0, 3)) {
    assert(!hasRawHtmlLeak(String(item.title ?? '')), 'HTML in home recommendation title')
  }

  console.log('[verify-hard] PASS')
}

run().catch((e) => {
  console.error('[verify-hard] FAIL', e instanceof Error ? e.message : e)
  process.exit(1)
})
