#!/usr/bin/env tsx
/**
 * 신청 준비 문서 여정 — plan / checklist / timeline
 * 실행: npm run verify:journey-documents
 * 로그인 생성 경로: .env.local 에 STORY_SESSION_COOKIE 설정
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
    json = { raw: text.slice(0, 400) }
  }
  return { status: res.status, json }
}

async function fetchPage(path: string) {
  const res = await fetch(`${BASE}${path}`)
  return { status: res.status, text: await res.text() }
}

async function section(name: string, fn: () => Promise<void>) {
  console.log(`\n[documents] ${name}`)
  try {
    await fn()
  } catch (e) {
    failed += 1
    console.error(`  ✗ ${e instanceof Error ? e.message : e}`)
  }
}

async function getSampleProgram(): Promise<{ id: string; title: string; announcementText: string; deadline: string }> {
  const search = await fetchJson('/api/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      region: '경기',
      industry: '제조업',
      business_age_years: 3,
      page: 1,
      limit: 3,
    }),
  })
  assert(search.status === 200 && search.json.ok === true, 'sample search for documents journey')
  const programs = (search.json.programs as Json[]) ?? []
  assert(programs.length > 0, 'need at least one program')
  const p = programs[0]
  const title = String(p.title ?? '테스트 공고')
  const announcementText = [
    String(p.organization ?? ''),
    String(p.support_type ?? ''),
    String(p.eligibility_text ?? title),
  ]
    .filter(Boolean)
    .join('\n')
  const deadline =
    typeof p.application_end_date === 'string'
      ? String(p.application_end_date).slice(0, 10)
      : '2026-12-31'
  return { id: String(p.id), title, announcementText: announcementText || title, deadline }
}

async function main() {
  console.log(`[verify-journey-documents] base=${BASE}${COOKIE ? ' (with session)' : ' (guest)'}`)

  const sample = await getSampleProgram()

  await section('UI 페이지·탭', async () => {
    const isClientShell = (html: string) => html.includes('신청 준비 문서 생성')

    for (const tab of ['plan', 'checklist', 'timeline'] as const) {
      const url = `/documents/plan?program_id=${encodeURIComponent(sample.id)}&tab=${tab}`
      const page = await fetchPage(url)
      assert(page.status === 200, `${url} → 200`)
      if (isClientShell(page.text)) {
        assert(page.text.includes('생성하기'), `tab=${tab} has generate CTA`)
        if (tab === 'plan') {
          assert(page.text.includes('사업계획서 초안'), 'plan tab label')
          assert(page.text.includes('PSST'), 'psst template option')
        }
        if (tab === 'checklist') assert(page.text.includes('서류 체크리스트'), 'checklist tab label')
        if (tab === 'timeline') assert(page.text.includes('신청 타임라인'), 'timeline tab label')
      } else {
        assert(
          page.text.includes('documents/plan') || page.text.includes('사업계획'),
          `tab=${tab} CSR shell (meta/번들만 SSR)`
        )
      }
    }

    const bare = await fetchPage('/documents/plan')
    assert(bare.status === 200, '/documents/plan without program_id loads')
  })

  await section('검색·자격 → 문서 진입 링크', async () => {
    const detail = await fetchPage(`/search/${sample.id}`)
    assert(detail.status === 200, 'program detail 200')
    assert(detail.text.includes('신청 준비'), 'detail has documents CTA')
    assert(
      detail.text.includes(`/documents/plan?program_id=${sample.id}`) ||
        detail.text.includes('documents/plan'),
      'detail links to documents/plan with program_id'
    )

    const elig = await fetchPage(`/eligibility?program_id=${encodeURIComponent(sample.id)}`)
    assert(elig.status === 200, 'eligibility page 200')
    assert(elig.text.includes('사업계획서') || elig.text.includes('체크리스트'), 'eligibility doc shortcuts')
  })

  await section('API 인증·입력 검증 (게스트)', async () => {
    const emptyPlan = await fetchJson('/api/documents/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ announcementTitle: '', announcementText: '' }),
    })
    assert(
      [400, 401].includes(emptyPlan.status),
      `plan empty guest → 400 validation or 401 middleware (got ${emptyPlan.status})`
    )

    const validPlanGuest = await fetchJson('/api/documents/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        announcementTitle: sample.title,
        announcementText: 'a'.repeat(120),
        template: 'gov',
      }),
    })
    assert(validPlanGuest.status === 401, 'plan valid body guest → 401')
    assert(
      validPlanGuest.json.error_code === 'AUTH_REQUIRED' ||
        String(validPlanGuest.json.error ?? '').includes('로그인'),
      'plan guest AUTH_REQUIRED'
    )

    const timelineNoDeadline = await fetchJson('/api/documents/timeline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ announcementTitle: sample.title }),
    })
    assert(
      [400, 401].includes(timelineNoDeadline.status),
      'timeline missing deadline → 400 or 401'
    )

    const checklistGuest = await fetchJson('/api/documents/checklist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        announcementTitle: sample.title,
        announcementText: sample.announcementText,
        deadline: sample.deadline,
        businessType: '법인',
      }),
    })
    assert(checklistGuest.status === 401, 'checklist guest → 401')
  })

  if (COOKIE) {
    await section('API 생성 (로그인)', async () => {
      const checklist = await fetchJson('/api/documents/checklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          program_id: sample.id,
          announcementTitle: sample.title,
          announcementText: sample.announcementText,
          deadline: sample.deadline,
          businessType: '법인',
        }),
      })
      assert(checklist.status === 200, `checklist 200 (got ${checklist.status})`)
      assert(checklist.json.ok === true, 'checklist ok:true')
      assert(typeof checklist.json.totalDocuments === 'number', 'checklist totalDocuments')
      assert(
        Array.isArray(checklist.json.checklist) && (checklist.json.checklist as unknown[]).length > 0,
        'checklist items non-empty'
      )

      const timeline = await fetchJson('/api/documents/timeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          program_id: sample.id,
          announcementTitle: sample.title,
          deadline: sample.deadline,
        }),
      })
      assert(timeline.status === 200, `timeline 200 (got ${timeline.status})`)
      assert(timeline.json.ok === true, 'timeline ok:true')
      const milestones = timeline.json.milestones as unknown[] | undefined
      assert(Array.isArray(milestones) && milestones.length > 0, 'timeline milestones non-empty')
      const first = milestones![0] as Json
      assert(typeof first.stage === 'string' && typeof first.date === 'string', 'milestone shape')

      const plan = await fetchJson('/api/documents/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          program_id: sample.id,
          announcementTitle: sample.title,
          announcementText: sample.announcementText.slice(0, 8000) || sample.title,
          template: 'gov',
          companyProfile: {
            companyName: '문서여정검증 주식회사',
            industry: '제조업',
            employeeCount: 10,
            problemStatement: '시장 문제 검증',
            solution: '솔루션 검증',
          },
        }),
      })
      assert(plan.status === 200, `plan 200 (got ${plan.status})`)
      assert(plan.json.ok === true, 'plan ok:true')
      const sections = plan.json.sections as unknown[] | undefined
      assert(Array.isArray(sections) && sections.length >= 3, 'plan has multiple sections')
      const s0 = sections![0] as Json
      assert(typeof s0.title === 'string', 'plan section title')
      assert(
        typeof s0.draft === 'string' || Array.isArray(s0.subsections),
        'plan section has draft or subsections'
      )
      assert(
        typeof (plan.json.draftMeta as Json | undefined)?.confidence === 'number',
        'plan draftMeta.confidence'
      )

      const planPsst = await fetchJson('/api/documents/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          announcementTitle: sample.title,
          announcementText: sample.announcementText.slice(0, 4000) || sample.title,
          template: 'psst',
          companyProfile: { companyName: 'PSST 검증', industry: 'IT/소프트웨어' },
        }),
      })
      assert(
        [200, 429, 403].includes(planPsst.status),
        `psst template (got ${planPsst.status}, quota may block)`
      )
      if (planPsst.status === 200) {
        assert(Array.isArray(planPsst.json.sections), 'psst sections')
      }
    })
  } else {
    console.log('  ⊘ STORY_SESSION_COOKIE 없음 — plan/checklist/timeline 생성 성공 경로 생략')
  }

  await section('가이드·푸터 진입', async () => {
    const guide = await fetchPage('/guide')
    assert(guide.status === 200 && guide.text.includes('/documents/plan'), 'guide links documents')
    const homeFooter = await fetchPage('/')
    assert(homeFooter.text.includes('사업계획서'), 'home footer documents link')
  })

  console.log(`\n[verify-journey-documents] done: ${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
  console.log('[verify-journey-documents] PASS')
}

main().catch((e) => {
  console.error('[verify-journey-documents] FATAL', e)
  process.exit(1)
})
