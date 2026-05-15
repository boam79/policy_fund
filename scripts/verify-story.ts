/* eslint-disable no-console */
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

async function run() {
  console.log(`[verify-story] base=${BASE_URL}`)

  // US-01: parse invalid input -> standardized error
  const parseInvalid = await requestJson('/api/query/parse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: '' }),
  })
  assert(parseInvalid.status === 400, 'US-01 expected 400 on empty parse query')
  assert(parseInvalid.json.error_code === 'PARSE_INVALID_INPUT', 'US-01 missing PARSE_INVALID_INPUT')
  assert(typeof parseInvalid.json.trace_id === 'string', 'US-01 missing trace_id')

  // US-06 negative: eligibility missing program_id
  const eligibilityInvalid = await requestJson('/api/eligibility', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile: {} }),
  })
  assert(eligibilityInvalid.status === 400, 'US-06 expected 400 when program_id missing')
  assert(
    eligibilityInvalid.json.error_code === 'ELIGIBILITY_PROGRAM_ID_REQUIRED',
    'US-06 missing ELIGIBILITY_PROGRAM_ID_REQUIRED'
  )

  // US-10 negative: timeline missing deadline
  const timelineInvalid = await requestJson('/api/documents/timeline', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ announcementTitle: '테스트 공고' }),
  })
  assert(timelineInvalid.status === 400, 'US-10 expected 400 when deadline missing')
  assert(
    timelineInvalid.json.error_code === 'DOC_TIMELINE_INPUT_REQUIRED',
    'US-10 missing DOC_TIMELINE_INPUT_REQUIRED'
  )

  // US-12/13: admin and export should be forbidden without admin session
  const adminUsers = await requestJson('/api/admin/users')
  assert([401, 403].includes(adminUsers.status), 'US-12 expected 401/403 for admin users API')
  const exportCsv = await requestJson('/api/export/csv', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'programs' }),
  })
  assert([401, 403].includes(exportCsv.status), 'US-13 expected 401/403 for export csv API')

  console.log('[verify-story] PASS')
}

run().catch((err) => {
  console.error('[verify-story] FAIL', err instanceof Error ? err.message : err)
  process.exit(1)
})
