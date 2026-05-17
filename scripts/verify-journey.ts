#!/usr/bin/env tsx
/**
 * 유저 여정 E2E: 검색 → 공고 상세 → 자격판정 → 신청 문서
 * 실행: npm run verify:journey
 */
/* eslint-disable no-console */
export {}

type Json = Record<string, unknown>

const BASE = process.env.STORY_BASE_URL ?? 'http://localhost:3000'
const STORY_SESSION_COOKIE = process.env.STORY_SESSION_COOKIE?.trim()

function withAuth(init?: RequestInit): RequestInit {
  if (!STORY_SESSION_COOKIE) return init ?? {}
  const h = new Headers(init?.headers)
  h.set('Cookie', STORY_SESSION_COOKIE)
  return { ...init, headers: h }
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg)
}

async function fetchJson(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, withAuth(init))
  const text = await res.text()
  let json: Json = {}
  try {
    json = text ? (JSON.parse(text) as Json) : {}
  } catch {
    json = { raw: text.slice(0, 500) }
  }
  return { status: res.status, json, text }
}

async function fetchPage(path: string) {
  const res = await fetch(`${BASE}${path}`)
  const text = await res.text()
  return { status: res.status, text }
}

function hasDbHtmlLeak(s: string): boolean {
  return (
    /<p(?:\s|>)(?!.*className)/i.test(s) ||
    /<div\s+style=/i.test(s) ||
    /&nbsp;/i.test(s) ||
    /<br\s*\/?>\s*[^\s<]/i.test(s)
  )
}

async function run() {
  console.log(`[verify-journey] base=${BASE}`)

  const profile = {
    region: '경기',
    industry: '제조업',
    business_age_years: 3,
    employee_count: 10,
    tax_arrears: false,
    support_purpose: '운전자금',
  }

  // 1) 검색
  const search = await fetchJson('/api/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...profile, page: 1, limit: 5 }),
  })
  assert(search.status === 200 && search.json.ok === true, `Search failed: ${search.status}`)
  const programs = (search.json.programs as Json[] | undefined) ?? []
  assert(programs.length > 0, 'Search returned no programs')
  const programId = String(programs[0].id)
  const title = String(programs[0].title ?? '')
  assert(title.length > 0, 'Program missing title')
  assert(!hasDbHtmlLeak(title), `HTML leak in search result title: ${title.slice(0, 60)}`)

  // 2) 공고 상세 페이지
  const detail = await fetchPage(`/search/${programId}`)
  assert(detail.status === 200, `Detail page ${programId} expected 200, got ${detail.status}`)
  assert(detail.text.includes('자격판정 시작하기'), 'Detail page missing eligibility CTA')
  assert(detail.text.includes('신청 준비 시작하기'), 'Detail page missing documents CTA')
  // 3) 자격판정 페이지 (program_id)
  const eligPage = await fetchPage(`/eligibility?program_id=${encodeURIComponent(programId)}`)
  assert(eligPage.status === 200, `Eligibility page expected 200, got ${eligPage.status}`)
  assert(!eligPage.text.includes('공고 정보가 없습니다'), 'Eligibility page missing program_id handling')

  // 4a) 공개 API — 비로그인 사용자도 홈·트렌딩 조회 가능
  const homeRecRes = await fetch(`${BASE}/api/home/recommendations`)
  const homeRecJson = (await homeRecRes.json().catch(() => ({}))) as Json
  assert(homeRecRes.status === 200, `GET /api/home/recommendations expected 200, got ${homeRecRes.status}`)
  assert(homeRecJson.ok === true, 'home recommendations expected ok: true')

  const trendingRes = await fetch(`${BASE}/api/programs/trending`)
  assert(trendingRes.status === 200, `GET /api/programs/trending expected 200, got ${trendingRes.status}`)
  const trendingJson = (await trendingRes.json().catch(() => ({}))) as Json
  assert(
    typeof trendingJson === 'object' && trendingJson !== null,
    'trending response should be an object'
  )

  // 4b) 진단 → 검색 파라미터 (Phase 12-2)
  const diagParse = await fetchJson('/api/query/parse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: '서울 소프트웨어 업력 3년 지원사업' }),
  })
  assert(diagParse.status === 200, `Diagnosis parse failed: ${diagParse.status}`)
  const diagParsed = (diagParse.json.data as Json | undefined)?.parsed as Json | undefined
  const diagConds = (diagParsed?.conditions as Json | undefined) ?? {}
  const diagAge = (diagConds.business_age_years as Json | undefined)?.value
  assert(Number(diagAge) === 3, 'Journey: expected business_age_years 3 from parse')
  const diagIndustry = (diagConds.industry as Json | undefined)?.value
  assert(String(diagIndustry) === 'IT/소프트웨어', 'Journey: expected IT/소프트웨어 industry')

  const sessionPost = await fetchJson('/api/diagnosis/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      raw_query: '서울 소프트웨어 업력 3년 지원사업',
      parsed: diagParsed,
    }),
  })
  if (sessionPost.status === 200 && sessionPost.json.ok === true) {
    const sid = String(sessionPost.json.sid)
    const sessionGet = await fetchJson(`/api/diagnosis/session?id=${encodeURIComponent(sid)}`)
    assert(sessionGet.status === 200, 'Journey: diagnosis session GET failed')
    const gotAge = (
      ((sessionGet.json.parsed as Json | undefined)?.conditions as Json | undefined)
        ?.business_age_years as Json | undefined
    )?.value
    assert(Number(gotAge) === 3, 'Journey: session roundtrip business_age_years')
  } else {
    console.log(
      '[verify-journey] diagnosis_sessions skip — run scripts/sql/diagnosis_sessions.sql on Supabase'
    )
  }

  const diagSearch = await fetchJson('/api/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      region: '서울',
      industry: 'IT/소프트웨어',
      business_age_years: 3,
      search_mode: 'relaxed',
      page: 1,
      limit: 5,
    }),
  })
  assert(diagSearch.status === 200 && diagSearch.json.ok === true, 'Journey: diagnosis-aligned search failed')

  // 4) 자격판정 API
  const elig = await fetchJson('/api/eligibility', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ program_id: programId, profile }),
  })
  assert(elig.status === 200, `Eligibility API failed: ${elig.status} ${JSON.stringify(elig.json)}`)
  assert(typeof elig.json.status === 'string', 'Eligibility missing status')
  assert(typeof elig.json.score === 'number', 'Eligibility missing score')

  // 5) 신청 준비 페이지 (각 탭)
  for (const tab of ['plan', 'checklist', 'timeline'] as const) {
    const docPage = await fetchPage(
      `/documents/plan?program_id=${encodeURIComponent(programId)}&tab=${tab}`
    )
    assert(docPage.status === 200, `Documents page tab=${tab} expected 200`)
    assert(!docPage.text.includes('공고 ID로 저장된 정보를 찾지 못했습니다'), `Program ${programId} not found for tab ${tab}`)
  }

  // 6–8) 문서 AI API: 로그인 시 성공 경로 / 비로그인 시 401 (불특정 다수 남용 방지)
  if (!STORY_SESSION_COOKIE) {
    const announcementText = [
      String(programs[0].organization ?? ''),
      String(programs[0].support_type ?? ''),
      String(programs[0].eligibility_text ?? title),
    ]
      .filter(Boolean)
      .join('\n')
    const deadline =
      typeof programs[0].application_end_date === 'string'
        ? String(programs[0].application_end_date).slice(0, 10)
        : '2026-12-31'

    const rPlan = await fetch(`${BASE}/api/documents/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        announcementTitle: '여정 검증',
        announcementText: 'a'.repeat(120),
      }),
    })
    assert(rPlan.status === 401, `비로그인 documents/plan 기대 401, 실제 ${rPlan.status}`)

    const rCheck = await fetch(`${BASE}/api/documents/checklist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        announcementTitle: title,
        announcementText: announcementText || title,
        deadline,
        businessType: '법인',
      }),
    })
    assert(rCheck.status === 401, `비로그인 documents/checklist 기대 401, 실제 ${rCheck.status}`)

    const rTime = await fetch(`${BASE}/api/documents/timeline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        announcementTitle: title,
        deadline,
      }),
    })
    assert(rTime.status === 401, `비로그인 documents/timeline 기대 401, 실제 ${rTime.status}`)
    console.warn('[verify-journey] STORY_SESSION_COOKIE 없음 — 문서 API는 401 확인만 수행(성공 경로 생략)')
  } else {
  const announcementText = [
    String(programs[0].organization ?? ''),
    String(programs[0].support_type ?? ''),
    String(programs[0].eligibility_text ?? title),
  ]
    .filter(Boolean)
    .join('\n')

  const deadline =
    typeof programs[0].application_end_date === 'string'
      ? String(programs[0].application_end_date).slice(0, 10)
      : '2026-12-31'

  // 6) 체크리스트 API
  const checklist = await fetchJson('/api/documents/checklist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      program_id: programId,
      announcementTitle: title,
      announcementText: announcementText || title,
      deadline,
      businessType: '법인',
    }),
  })
  assert(checklist.status === 200, `Checklist API failed: ${checklist.status}`)
  assert(typeof checklist.json.totalDocuments === 'number', 'Checklist missing totalDocuments')

  // 7) 타임라인 API
  const timeline = await fetchJson('/api/documents/timeline', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      program_id: programId,
      announcementTitle: title,
      deadline,
    }),
  })
  assert(timeline.status === 200, `Timeline API failed: ${timeline.status}`)
  assert(Array.isArray(timeline.json.milestones), 'Timeline missing milestones')

  // 8) 사업계획서 API
  const plan = await fetchJson('/api/documents/plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      program_id: programId,
      announcementTitle: title,
      announcementText: announcementText || title,
      template: 'gov',
      companyProfile: {
        companyName: '여정검증 주식회사',
        industry: profile.industry,
        employeeCount: profile.employee_count,
      },
    }),
  })
  assert(plan.status === 200, `Plan API failed: ${plan.status}`)
  assert(Array.isArray(plan.json.sections), 'Plan missing sections')
  }

  console.log('[verify-journey] PASS', { programId, title: title.slice(0, 40) })
}

run().catch((e) => {
  console.error('[verify-journey] FAIL', e instanceof Error ? e.message : e)
  process.exit(1)
})
