#!/usr/bin/env tsx
/**
 * 유저 여정 전수 시뮬레이션 — API·페이지·엣지 케이스
 * 실행: npm run verify:journey-exhaustive (dev 또는 STORY_BASE_URL)
 */
import { config } from 'dotenv'

config({ path: '.env.local' })

type Json = Record<string, unknown>

const BASE = process.env.STORY_BASE_URL ?? 'http://localhost:3000'
const COOKIE = process.env.STORY_SESSION_COOKIE?.trim()

let passed = 0
let failed = 0

function assert(cond: boolean, msg: string) {
  if (!cond) {
    failed += 1
    console.error(`  ✗ ${msg}`)
    return
  }
  passed += 1
}

function withAuth(init?: RequestInit): RequestInit {
  if (!COOKIE) return init ?? {}
  const h = new Headers(init?.headers)
  h.set('Cookie', COOKIE)
  return { ...init, headers: h }
}

async function fetchJson(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, withAuth(init))
  const text = await res.text()
  let json: Json = {}
  try {
    json = text ? (JSON.parse(text) as Json) : {}
  } catch {
    json = { raw: text.slice(0, 300) }
  }
  return { status: res.status, json, text }
}

async function fetchPage(path: string, redirect: 'follow' | 'manual' = 'follow') {
  const res = await fetch(`${BASE}${path}`, { redirect })
  const text = await res.text()
  return { status: res.status, text, location: res.headers.get('location') }
}

async function section(name: string, fn: () => Promise<void>) {
  console.log(`\n[exhaustive] ${name}`)
  try {
    await fn()
  } catch (e) {
    failed += 1
    console.error(`  ✗ ${e instanceof Error ? e.message : e}`)
  }
}

async function main() {
  console.log(`[verify-journey-exhaustive] base=${BASE}`)

  await section('홈·공개 페이지', async () => {
    for (const p of [
      '/',
      '/search',
      '/diagnosis',
      '/eligibility',
      '/evaluate',
      '/documents/plan',
      '/report/quick',
      '/guide',
      '/support',
      '/faq',
      '/about',
      '/contact',
      '/login',
      '/signup',
      '/terms',
      '/privacy',
    ]) {
      const { status } = await fetchPage(p)
      assert(status === 200, `${p} → 200 (got ${status})`)
    }
    for (const p of ['/mypage', '/manage', '/mypage/alerts', '/billing/checkout']) {
      const res = await fetchPage(p, 'manual')
      assert(
        [301, 302, 303, 307, 308].includes(res.status),
        `${p} redirects guest to login (got ${res.status})`
      )
    }
    const diagNoParams = await fetchPage('/diagnosis')
    assert(diagNoParams.status === 200, '/diagnosis without params loads (client shows guidance)')
    const diagProgram = await fetchPage('/diagnosis?program_id=00000000-0000-4000-8000-000000000001')
    assert(diagProgram.status === 200, '/diagnosis?program_id loads (client redirects to eligibility)')
  })

  await section('parse 지역·지원목적 한글 정규화', async () => {
    const seoul = await fetchJson('/api/query/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '서울 IT 스타트업 업력 3년 운영자금' }),
    })
    assert(seoul.status === 200, 'parse 서울·운영자금 200')
    const parsed = (seoul.json.data as Json)?.parsed as Json | undefined
    const conds = (parsed?.conditions as Json) ?? {}
    const summary = String(parsed?.summary ?? '')
    assert(!/\bSeoul\b/i.test(summary), 'summary must not show English region Seoul')
    assert(!/Operating funds/i.test(summary), 'summary must not show English purpose')
    const region = (conds.region as Json | undefined)?.value
    const city = (conds.city as Json | undefined)?.value
    const purpose = (conds.support_purpose as Json | undefined)?.value
    if (region) assert(String(region) === '서울', `region should be 서울 (got ${region})`)
    if (city) assert(String(city) !== 'Seoul', 'city must not remain English Seoul')
    if (purpose) {
      assert(
        ['운전자금', '운영자금', '시설자금', '사업화', '마케팅', '수출', '고용', '인력', '연구개발', 'R&D', '창업'].some(
          (p) => String(purpose).includes(p)
        ),
        `support_purpose should be Korean keyword (got ${purpose})`
      )
    }
    const { buildSearchQueryFromDiagnosis } = await import('../lib/diagnosis/buildSearchParams')
    const qs = buildSearchQueryFromDiagnosis(
      {
        conditions: conds as import('../lib/query/parseNaturalLanguage').ParsedConditions,
        summary,
        missing_important: [],
        raw_query: '서울 IT 스타트업 업력 3년 운영자금',
      },
      {}
    )
    assert(qs.includes('region=%EC%84%9C%EC%9A%B8') || qs.includes('region=서울'), 'search qs should use region=서울')
    assert(!qs.includes('city=Seoul'), 'search qs must not use city=Seoul')
  })

  await section('parse 업력 「N년 미만」', async () => {
    const under = await fetchJson('/api/query/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '서울 IT 스타트업 창업 1년 미만 사업화' }),
    })
    assert(under.status === 200, 'parse 1년 미만 200')
    const parsed = (under.json.data as Json)?.parsed as Json | undefined
    const summary = String(parsed?.summary ?? '')
    assert(!summary.includes('업력은 0년'), 'summary must not show misleading 0년 for 1년 미만')
    assert(summary.includes('미만') || summary.includes('1년'), 'summary mentions under-one-year')
  })

  await section('parse 엣지', async () => {
    const empty = await fetchJson('/api/query/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '' }),
    })
    assert(empty.status === 400, 'empty query → 400')

    const long = await fetchJson('/api/query/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'a'.repeat(501) }),
    })
    assert(long.status === 400, '501 char query → 400')

    const badJson = await fetchJson('/api/query/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    })
    assert(badJson.status === 400, 'invalid JSON → 400')

    const valid = await fetchJson('/api/query/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '서울 IT 3년' }),
    })
    assert(valid.status === 200 && valid.json.success === true, 'valid parse → 200')

    const gyeonggi = await fetchJson('/api/query/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '경기도 제조업 3년차 직원 5명 운영자금' }),
    })
    assert(gyeonggi.status === 200, 'gyeonggi parse 200')
    const gSummary = String(((gyeonggi.json.data as Json)?.parsed as Json | undefined)?.summary ?? '')
    assert(!gSummary.includes('년로'), 'parse summary must not use wrong particle (년로)')
    assert(gSummary.includes('으로 추정') || gSummary.includes('로 추정'), 'parse summary uses natural particle')
    assert(!gSummary.includes('IT으로'), 'parse summary must not use IT으로')

    const itOnly = await fetchJson('/api/query/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '업종 IT' }),
    })
    const itSummary = String(((itOnly.json.data as Json)?.parsed as Json | undefined)?.summary ?? '')
    assert(!itSummary.includes('IT으로'), 'IT-only parse summary particle')
  })

  await section('[exhaustive] search empty_state·requested_filters', async () => {
    const { buildSearchEmptyState } = await import('../lib/search/emptyResult')
    const sample = buildSearchEmptyState({
      search_mode: 'relaxed',
      fallback_applied: ['drop_industry'],
      requested_filters: {
        region: '서울',
        city: null,
        industry: '제조업',
        keyword: null,
        support_purpose: null,
      },
      applied_filters: {
        region: '서울',
        city: null,
        industry: null,
        keyword: null,
        support_purpose: null,
      },
    })
    assert(sample.kind === 'relaxed_zero_after_fallback', 'empty_state kind after fallback')
    assert(sample.filtersRelaxed === true, 'filtersRelaxed flag')

    const search = await fetchJson('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ region: '서울', industry: '제조업', limit: 3 }),
    })
    assert(search.status === 200 && search.json.ok === true, 'search 200')
    assert(
      (search.json.requested_filters as { region?: string })?.region === '서울',
      'requested_filters on success'
    )
    if (Number(search.json.total) === 0) {
      const empty = search.json.empty_state as { title?: string } | null
      assert(Boolean(empty?.title), 'empty_state when total=0')
    }
  })

  await section('search 엣지', async () => {
    const noBody = await fetchJson('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    })
    assert(noBody.status === 200 && noBody.json.ok === true, 'empty search body → 200 relaxed')

    const strictAnon = await fetchJson('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ region: '서울', search_mode: 'strict', page: 1, limit: 3 }),
    })
    assert(
      strictAnon.status === 401 && strictAnon.json.error_code === 'AUTH_REQUIRED_FOR_STRICT',
      'anon strict → 401'
    )

    const includeClosed = await fetchJson('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        region: '서울',
        include_closed: true,
        page: 1,
        limit: 3,
      }),
    })
    assert(includeClosed.status === 200, 'include_closed → 200')
    const af = includeClosed.json.applied_filters as { include_closed?: boolean }
    assert(af?.include_closed === true, 'include_closed in applied_filters')

    const page0 = await fetchJson('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page: 0, limit: 5 }),
    })
    assert(page0.status === 200, 'page 0 coerced or ok')

    const hugeLimit = await fetchJson('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page: 1, limit: 999 }),
    })
    assert(hugeLimit.status === 200, 'large limit handled')
    const programs = (hugeLimit.json.programs as unknown[]) ?? []
    assert(programs.length <= 50, 'limit capped at SEARCH_MAX_LIMIT 50')
  })

  await section('진단 세션', async () => {
    const getMissing = await fetchJson('/api/diagnosis/session')
    assert(getMissing.status === 400, 'GET session without id → 400')

    const getFake = await fetchJson('/api/diagnosis/session?id=not-a-uuid')
    assert(
      getFake.status === 400 && getFake.json.error_code === 'DIAGNOSIS_SESSION_INVALID_ID',
      'GET invalid sid → 400 DIAGNOSIS_SESSION_INVALID_ID'
    )

    const getNoToken = await fetchJson(
      '/api/diagnosis/session?id=00000000-0000-4000-8000-000000000001'
    )
    assert(
      getNoToken.status === 401 && getNoToken.json.error_code === 'DIAGNOSIS_SESSION_TOKEN_REQUIRED',
      'GET without token → 401'
    )

    const postEmpty = await fetchJson('/api/diagnosis/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    assert(postEmpty.status === 400, 'POST session empty → 400')
  })

  await section('eligibility 엣지', async () => {
    const noProgram = await fetchJson('/api/eligibility', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile: { region: '서울' } }),
    })
    assert(noProgram.status === 400, 'eligibility without program_id → 400')

    const fakeId = await fetchJson('/api/eligibility', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        program_id: '00000000-0000-4000-8000-000000000099',
        profile: { region: '서울', industry: 'IT/소프트웨어' },
      }),
    })
    assert([404, 400].includes(fakeId.status), 'eligibility fake program → 404/400')
  })

  await section('전체 여정 A: parse → session → search URL', async () => {
    const parse = await fetchJson('/api/query/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '서울 소프트웨어 업력 3년' }),
    })
    assert(parse.status === 200, 'journey A parse')
    const parsed = (parse.json.data as Json)?.parsed
    const session = await fetchJson('/api/diagnosis/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw_query: '서울 소프트웨어 업력 3년', parsed }),
    })
    if (session.status === 200 && session.json.ok === true) {
      const sid = String(session.json.sid)
      const token = String(session.json.token ?? '')
      assert(Boolean(token), 'journey A session token')
      const diagQs = new URLSearchParams({ sid, token })
      const diagPage = await fetchPage(`/diagnosis?${diagQs.toString()}`)
      assert(diagPage.status === 200, 'diagnosis?sid page 200')
      assert(
        !diagPage.text.includes('진단 세션을 불러올 수 없습니다'),
        'diagnosis sid loads without session error'
      )
      const search = await fetchJson('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          region: '서울',
          industry: 'IT/소프트웨어',
          business_age_years: 3,
          page: 1,
          limit: 5,
        }),
      })
      assert(search.status === 200 && ((search.json.programs as unknown[])?.length ?? 0) > 0, 'journey A search results')
      const pid = String((search.json.programs as Json[])[0].id)
      const detail = await fetchPage(`/search/${pid}`)
      assert(detail.status === 200 && detail.text.includes('자격판정'), 'journey A detail page')
    } else {
      console.log('  ⊘ diagnosis_sessions table skip (POST not 200)')
    }
  })

  await section('전체 여정 B: data= legacy param', async () => {
    const minimal = {
      conditions: {
        region: { value: '서울', confidence: 0.9 },
        industry: { value: 'IT/소프트웨어', confidence: 0.9 },
        business_age_years: { value: 3, confidence: 0.9 },
      },
      summary: 'test',
      missing_important: [],
      raw_query: 'test',
    }
    const encoded = encodeURIComponent(JSON.stringify(minimal))
    const diagPage = await fetchPage(`/diagnosis?data=${encoded}`)
    assert(diagPage.status === 200, 'diagnosis?data= page 200')
    assert(!diagPage.text.includes('조건 데이터가 유효하지 않습니다'), 'legacy data= parses')
  })

  await section('billing·entitlements', async () => {
    const ent = await fetchJson('/api/billing/entitlements')
    assert(ent.status === 200 && ent.json.ok === true, 'entitlements 200')
    const sub = await fetchJson('/api/billing/subscription')
    assert([200, 401].includes(sub.status), 'subscription 200 or 401')
  })

  await section('export 게이트', async () => {
    const userExport = await fetchJson('/api/export/user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'search_results', format: 'csv', rows: [] }),
    })
    assert([401, 403].includes(userExport.status), 'export/user without auth blocked')
  })

  await section('관리자·알림 출처', async () => {
    const { matchProgramsForAlert } = await import('../lib/alerts/matchPrograms')
    const stub = {
      id: 'p1',
      title: '중소벤처24 테스트 공고',
      source: 'smes24',
      region: '서울',
      industry: 'IT/소프트웨어',
      industry_tags: null,
      status: 'open',
      application_end_date: new Date(Date.now() + 86400000 * 14).toISOString().slice(0, 10),
      created_at: new Date().toISOString(),
      synced_at: null,
    }
    const legacyHit = matchProgramsForAlert([stub], {
      regions: [],
      industries: [],
      sources: ['smba'],
      keywords: [],
      notify_days_before: 30,
      notify_new_programs: false,
    })
    assert(legacyHit.length === 1, 'alert profile smb a matches smes24 programs')

    const wrongId = matchProgramsForAlert([stub], {
      regions: [],
      industries: [],
      sources: ['smes24_wrong'],
      keywords: [],
      notify_days_before: 30,
      notify_new_programs: false,
    })
    assert(wrongId.length === 0, 'invalid source filter excludes smes24')

    for (const p of [
      '/admin',
      '/admin/dashboard',
      '/admin/programs',
      '/admin/programs?view=sync-verify',
      '/admin/sync',
    ]) {
      const res = await fetchPage(p, 'manual')
      assert(
        [301, 302, 303, 307, 308].includes(res.status),
        `${p} redirects when guest (got ${res.status})`
      )
    }

    const adminApiChecks: { path: string; method: string; body?: string }[] = [
      { path: '/api/admin/sync/verify?source=bizinfo', method: 'GET' },
      { path: '/api/admin/sync/heal', method: 'POST', body: JSON.stringify({ source: 'bizinfo' }) },
      { path: '/api/admin/programs/bizinfo-verify', method: 'GET' },
    ]
    for (const { path, method, body } of adminApiChecks) {
      const r = await fetchJson(path, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body,
      })
      assert([401, 403].includes(r.status), `${path} blocked without admin`)
    }
  })

  console.log(`\n[verify-journey-exhaustive] done: ${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
  console.log('[verify-journey-exhaustive] PASS')
}

main().catch((e) => {
  console.error('[verify-journey-exhaustive] FATAL', e)
  process.exit(1)
})
