#!/usr/bin/env tsx
/**
 * 유저 여정 E2E: 검색 → 공고 상세 → 자격판정 → 신청 문서
 * 실행: npm run verify:journey
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

  console.log('[verify-journey] PASS', { programId, title: title.slice(0, 40) })
}

run().catch((e) => {
  console.error('[verify-journey] FAIL', e instanceof Error ? e.message : e)
  process.exit(1)
})
