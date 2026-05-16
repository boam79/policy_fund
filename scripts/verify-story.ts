 
export {}
type Json = Record<string, unknown>

const BASE_URL = process.env.STORY_BASE_URL ?? 'http://localhost:3000'
/** 브라우저에서 복사한 Supabase 세션 쿠키(전체 Cookie 헤더 값). 없으면 문서·심사 API 성공 경로는 건너뜀 */
const STORY_SESSION_COOKIE = process.env.STORY_SESSION_COOKIE?.trim()

function withAuth(init?: RequestInit): RequestInit {
  if (!STORY_SESSION_COOKIE) return init ?? {}
  const h = new Headers(init?.headers)
  h.set('Cookie', STORY_SESSION_COOKIE)
  return { ...init, headers: h }
}

async function requestJson(path: string, init?: RequestInit): Promise<{ status: number; json: Json; traceId?: string }> {
  const res = await fetch(`${BASE_URL}${path}`, withAuth(init))
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

  // US-08: 미인증 시 문서 API는 401 (인증 우회 방지)
  const planUnauth = await requestJson('/api/documents/plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      announcementTitle: '보안 검증용 제목',
      announcementText: 'a'.repeat(120),
    }),
  })
  assert(planUnauth.status === 401, 'US-08 expected 401 for unauthenticated document plan')
  assert(planUnauth.json.error_code === 'AUTH_REQUIRED', 'US-08 expected AUTH_REQUIRED')

  const timelineUnauth = await requestJson('/api/documents/timeline', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ announcementTitle: '제목', deadline: '2026-12-31' }),
  })
  assert(timelineUnauth.status === 401, 'US-08b expected 401 for unauthenticated timeline')

  // US-10 negative: timeline missing deadline (본 검증은 입력 오류로 400, 인증 전에 처리)
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

  if (!STORY_SESSION_COOKIE) {
    console.warn(
      '[verify-story] STORY_SESSION_COOKIE 없음 — US-09·US-10b~US-11·US-18·US-19 문서/심사 API 성공 경로 생략'
    )
  } else {
  // US-09/10b/11: documents flow (로그인 세션 필요)
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
  }

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

  // US-17: home recommendations must include matchScore and recommendReason (PRD §6.3)
  const recRes = await requestJson('/api/home/recommendations')
  assert(recRes.status === 200, 'US-17 expected 200 from /api/home/recommendations')
  assert(recRes.json.ok === true, 'US-17 expected ok=true')
  const recItems = (recRes.json.data as Json[] | undefined) ?? []
  if (recItems.length > 0) {
    const firstRec = recItems[0] as Json
    assert(typeof firstRec.matchScore === 'number', 'US-17 matchScore must be a number')
    assert(typeof firstRec.recommendReason === 'string', 'US-17 recommendReason must be a string')
  }

  const evalQualityUnauth = await requestJson('/api/evaluate/quality', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      planText: 'a'.repeat(120),
      template: 'psst',
      programType: '테스트',
    }),
  })
  assert(evalQualityUnauth.status === 401, 'US-17b expected 401 unauthenticated evaluate quality')

  if (STORY_SESSION_COOKIE) {
  // US-18: quality evaluation must return PSST scores
  const qualityRes = await requestJson('/api/evaluate/quality', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      planText:
        '## 사업 개요\n당사는 경기도 양주시 소재 친환경 제조업체로 2023년 창업하여 연 매출 5억원을 달성 중입니다. 직원 8명 전원 정규직으로 운영하고 있습니다.\n\n## 사업 목표\n노후 생산설비를 첨단 자동화 설비로 교체하여 생산성 30% 향상, 불량률 50% 감소를 목표로 합니다.\n\n## 시장 분석\n친환경 제조 시장은 정부 탄소중립 정책에 힘입어 연 20% 성장 중입니다. 국내 시장 규모는 2024년 약 2조원으로 추정됩니다.\n\n## 추진 전략\n1단계 설비 도입, 2단계 공정 최적화, 3단계 판로 확대 순으로 진행할 예정입니다.\n\n## 재무 계획\n지원금 5000만원을 설비 구매에 활용하며 3년 내 ROI 150% 달성을 예상합니다.',
      template: 'psst',
      programType: '중소기업 설비 현대화 지원',
    }),
  })
  assert(qualityRes.status === 200, 'US-18 expected 200 from /api/evaluate/quality')
  assert(qualityRes.json.ok === true, 'US-18 expected ok=true')

  // US-19: startup evaluation must return rubric-based scores with comments
  const startupRes = await requestJson('/api/evaluate/startup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      programType: '예비창업패키지',
      technologyDescription: '친환경 바이오 소재를 활용한 분해성 포장재 개발 기술',
      differentiationFromExisting: '기존 플라스틱 대비 100% 생분해 가능하며 비용이 20% 저렴',
      customerValidation: '유통업체 3곳과 파일럿 계약 체결 완료',
      revenueModel: 'B2B 직납 + 온라인 소량 판매',
      salesPlan3Year: '1년차 2억, 2년차 5억, 3년차 12억 매출 목표',
      budgetPlan: '인건비 40%, 설비 30%, 마케팅 20%, 기타 10%',
      founderBackground: '화학공학 박사, 기업 연구소 10년 경력',
    }),
  })
  assert(startupRes.status === 200, 'US-19 expected 200 from /api/evaluate/startup')
  assert(startupRes.json.ok === true, 'US-19 expected ok=true')
  }

  // Edge case: 아무말 입력 → 우아하게 에러 처리 또는 최소 조건 추출
  const gibberishRes = await requestJson('/api/query/parse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: '아무말이나 해봅니다 ㅋㅋㅋ 지원사업이 뭐야' }),
  })
  assert(
    [200, 400, 429].includes(gibberishRes.status),
    'Edge: parse should return 200/400/429 on nonsense input'
  )

  // Edge case: 매우 긴 복잡한 문장
  const complexRes = await requestJson('/api/query/parse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: '저는 서울 강남구에서 IT 스타트업을 운영하고 있는데 창업한 지 2년 됐고 직원은 현재 12명이며 연 매출은 약 3억원이고 AI 기반 헬스케어 솔루션을 개발하고 있는데 정부 지원사업 중에서 기술개발이나 마케팅 지원을 받을 수 있는 사업이 있으면 좋겠고 가능하면 서울 지역 우선이었으면 합니다',
    }),
  })
  assert(
    [200, 400, 429].includes(complexRes.status),
    'Edge: parse should handle complex sentence gracefully'
  )
  if (complexRes.status === 200) {
    assert(complexRes.json.success === true, 'Edge: complex sentence should parse successfully')
  }

  console.log('[verify-story] PASS')
}

run().catch((err) => {
  console.error('[verify-story] FAIL', err instanceof Error ? err.message : err)
  process.exit(1)
})
