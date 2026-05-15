/* eslint-disable no-console */
export {}
type Json = Record<string, unknown>

const BASE_URL = process.env.STORY_BASE_URL ?? 'http://localhost:3000'

async function requestJson(path: string, init?: RequestInit): Promise<{ status: number; json: Json; traceId?: string }> {
  const res = await fetch(`${BASE_URL}${path}`, init)
  const text = await res.text()
  let json: Json = {}
  try {
    json = text ? (JSON.parse(text) as Json) : {}
  } catch {
    json = { raw: text }
  }
  return { status: res.status, json, traceId: res.headers.get('x-trace-id') ?? undefined }
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

function isStandardErrorShape(json: Json): boolean {
  return (
    json.ok === false &&
    typeof json.error_code === 'string' &&
    typeof json.message === 'string' &&
    typeof json.step === 'string' &&
    typeof json.trace_id === 'string'
  )
}

async function run() {
  console.log(`[verify-story] base=${BASE_URL}`)

  // US-01: parse invalid input -> standardized error
  const parseInvalid = await requestJson('/api/query/parse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: '' }),
  })
  assert(parseInvalid.status === 400, 'US-01 expected 400 on empty parse query')
  assert(isStandardErrorShape(parseInvalid.json), 'US-01 missing standardized error payload')
  assert(parseInvalid.json.error_code === 'PARSE_INVALID_INPUT', 'US-01 missing PARSE_INVALID_INPUT')
  assert(parseInvalid.traceId === parseInvalid.json.trace_id, 'US-01 trace header/body mismatch')

  // US-01b: parse valid query
  const parseValid = await requestJson('/api/query/parse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: '경기도 양주시 제조업 업력 1년 직원 5명 운전자금 지원사업 찾아줘' }),
  })
  assert(parseValid.status === 200, 'US-01b expected 200 on valid parse')
  assert(parseValid.json.success === true, 'US-01b expected success=true')
  const conditions = (parseValid.json.data as Json | undefined)?.conditions as Json | undefined

  // US-02/03: search with strict filters (fallback should prevent hard zero in normal state)
  const strictSearchPayload = {
    region: (conditions?.region as string | undefined) ?? '경기',
    city: (conditions?.city as string | undefined) ?? '양주시',
    industry: (conditions?.industry as string | undefined) ?? '제조업',
    business_age_years: (conditions?.business_age_years as number | undefined) ?? 1,
    employee_count: (conditions?.employee_count as number | undefined) ?? 5,
    support_purpose: (conditions?.support_purpose as string | undefined) ?? '운전자금',
    page: 1,
    limit: 5,
  }
  const searchStrict = await requestJson('/api/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(strictSearchPayload),
  })
  assert(searchStrict.status === 200, 'US-02 expected 200 from /api/search')
  assert(searchStrict.json.ok === true, 'US-02 expected ok=true')
  const programs = (searchStrict.json.programs as Json[] | undefined) ?? []
  assert(programs.length > 0, 'US-03 expected at least one program after fallback')

  // US-06 negative: eligibility missing program_id
  const eligibilityInvalid = await requestJson('/api/eligibility', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile: {} }),
  })
  assert(eligibilityInvalid.status === 400, 'US-06 expected 400 when program_id missing')
  assert(isStandardErrorShape(eligibilityInvalid.json), 'US-06 missing standardized error payload')
  assert(
    eligibilityInvalid.json.error_code === 'ELIGIBILITY_PROGRAM_ID_REQUIRED',
    'US-06 missing ELIGIBILITY_PROGRAM_ID_REQUIRED'
  )

  // US-06b: eligibility valid
  const firstProgram = programs[0]
  const programId = String(firstProgram.id)
  const eligibilityValid = await requestJson('/api/eligibility', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      program_id: programId,
      profile: {
        region: '경기',
        city: '양주시',
        industry: '제조업',
        business_age_years: 1,
        employee_count: 5,
        tax_arrears: false,
        support_purpose: '운전자금',
      },
    }),
  })
  assert(eligibilityValid.status === 200, 'US-06b expected 200 on valid eligibility check')
  assert(typeof eligibilityValid.json.status === 'string', 'US-06b expected status')
  assert(typeof eligibilityValid.json.score === 'number', 'US-06b expected score')

  // US-08/09/10/11: documents flow
  const announcementTitle = String(firstProgram.title ?? '테스트 공고')
  const announcementText = String(firstProgram.support_type ?? announcementTitle)

  const checklistValid = await requestJson('/api/documents/checklist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      program_id: programId,
      announcementTitle,
      announcementText,
      deadline: '2026-12-31',
      businessType: '법인',
    }),
  })
  assert(checklistValid.status === 200, 'US-09 expected 200 checklist generation')
  assert(typeof checklistValid.json.totalDocuments === 'number', 'US-09 expected totalDocuments')

  // US-10 negative: timeline missing deadline
  const timelineInvalid = await requestJson('/api/documents/timeline', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ announcementTitle: '테스트 공고' }),
  })
  assert(timelineInvalid.status === 400, 'US-10 expected 400 when deadline missing')
  assert(isStandardErrorShape(timelineInvalid.json), 'US-10 missing standardized error payload')
  assert(
    timelineInvalid.json.error_code === 'DOC_TIMELINE_INPUT_REQUIRED',
    'US-10 missing DOC_TIMELINE_INPUT_REQUIRED'
  )

  const timelineValid = await requestJson('/api/documents/timeline', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      program_id: programId,
      announcementTitle,
      deadline: '2026-12-31',
    }),
  })
  assert(timelineValid.status === 200, 'US-10b expected 200 timeline generation')
  assert(Array.isArray(timelineValid.json.milestones), 'US-10b expected milestones array')

  const planValid = await requestJson('/api/documents/plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      program_id: programId,
      announcementTitle,
      announcementText,
      template: 'gov',
      companyProfile: {
        companyName: '테스트 제조',
        industry: '제조업',
        employeeCount: 5,
      },
    }),
  })
  assert(planValid.status === 200, 'US-11 expected 200 plan generation')
  assert(Array.isArray(planValid.json.sections), 'US-11 expected sections array')

  // US-12/13: admin and export should be forbidden without admin session
  const adminUsers = await requestJson('/api/admin/users')
  assert([401, 403].includes(adminUsers.status), 'US-12 expected 401/403 for admin users API')
  const exportCsv = await requestJson('/api/export/csv', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'programs' }),
  })
  assert([401, 403].includes(exportCsv.status), 'US-13 expected 401/403 for export csv API')

  // US-14: billing confirm forged request should not succeed
  const billingConfirm = await requestJson('/api/billing/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      paymentKey: 'forged_key',
      orderId: 'forged_order',
      amount: 1000,
      plan: 'pro',
    }),
  })
  assert(
    [400, 401, 403, 503].includes(billingConfirm.status),
    'US-14 expected billing confirm to reject forged request'
  )

  // US-15: webhook forged request should not succeed
  const webhookForged = await requestJson('/api/billing/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      eventType: 'PAYMENT_STATUS_CHANGED',
      data: { orderId: 'forged', status: 'CANCELED', paymentKey: 'forged' },
    }),
  })
  assert([400, 401, 403, 503].includes(webhookForged.status), 'US-15 expected webhook rejection')

  // Rate-limit regression: parse endpoint should eventually return 429
  const parseCodes: number[] = []
  for (let i = 0; i < 24; i += 1) {
    const res = await requestJson('/api/query/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: `테스트 레이트리밋 ${i}` }),
    })
    parseCodes.push(res.status)
  }
  assert(parseCodes.some((c) => c === 429), 'Rate-limit regression: expected at least one 429')

  console.log('[verify-story] PASS')
}

run().catch((err) => {
  console.error('[verify-story] FAIL', err instanceof Error ? err.message : err)
  process.exit(1)
})
