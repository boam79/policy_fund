/**
 * Phase 12 Wave 2 — 진단 UX·세션·검색 파라미터 검증
 * Usage: tsx scripts/verify-wave2.ts
 */
import 'dotenv/config'
import { config } from 'dotenv'
import { buildSearchQueryFromDiagnosis } from '../lib/diagnosis/buildSearchParams'
import type { ParseNLResult } from '../lib/query/parseNaturalLanguage'

config({ path: '.env.local' })

const BASE = process.env.VERIFY_BASE_URL ?? 'http://localhost:3000'

type Json = Record<string, unknown>

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg)
}

async function fetchJson(
  path: string,
  init?: RequestInit
): Promise<{ status: number; json: Json }> {
  const res = await fetch(`${BASE}${path}`, init)
  const json = (await res.json().catch(() => ({}))) as Json
  return { status: res.status, json }
}

async function main() {
  console.log('[verify-wave2] base=%s', BASE)

  const parseRes = await fetchJson('/api/query/parse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: '서울 소프트웨어 업력 3년 지원사업' }),
  })
  assert(parseRes.status === 200 && parseRes.json.success === true, 'parse 200')
  const parsed = (parseRes.json.data as Json | undefined)?.parsed as ParseNLResult
  assert(parsed != null, 'parsed payload')
  assert(Number(parsed.conditions.business_age_years?.value) === 3, 'business_age_years=3')
  assert(
    String(parsed.conditions.industry?.value) === 'IT/소프트웨어',
    'industry IT/소프트웨어'
  )
  assert(
    !parsed.missing_important.includes('business_age_years'),
    'no missing business_age_years badge source'
  )

  const qs = buildSearchQueryFromDiagnosis(parsed, {})
  const sp = new URLSearchParams(qs)
  assert(sp.get('region') === '서울', 'search params region')
  assert(sp.get('industry') === 'IT/소프트웨어', 'search params industry')
  assert(sp.get('business_age_years') === '3', 'search params business_age_years')

  const sessionPost = await fetchJson('/api/diagnosis/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      raw_query: parsed.raw_query,
      parsed,
    }),
  })

  if (sessionPost.status === 200 && sessionPost.json.ok === true) {
    const sid = String(sessionPost.json.sid)
    const token = String(sessionPost.json.token ?? '')
    assert(sid.length >= 8, 'sid length')
    assert(Boolean(token), 'session token')
    const sessionGet = await fetchJson(
      `/api/diagnosis/session?id=${encodeURIComponent(sid)}&token=${encodeURIComponent(token)}`
    )
    assert(sessionGet.status === 200 && sessionGet.json.ok === true, 'session GET')
    const got = sessionGet.json.parsed as ParseNLResult
    assert(Number(got.conditions.business_age_years?.value) === 3, 'session roundtrip age')

    const diagQs = new URLSearchParams({ sid, token, q: parsed.raw_query })
    const diagPage = await fetch(`${BASE}/diagnosis?${diagQs.toString()}`)
    assert(diagPage.status === 200, 'diagnosis page with sid 200')
    const html = await diagPage.text()
    assert(
      html.includes('diagnosis') || html.includes('조건 확인') || html.includes('__next'),
      'diagnosis page shell'
    )
  } else {
    console.log(
      '[verify-wave2] WARN: diagnosis_sessions unavailable (%s) — run scripts/sql/diagnosis_sessions.sql',
      sessionPost.status
    )
  }

  const searchRes = await fetchJson('/api/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      region: '서울',
      industry: 'IT/소프트웨어',
      business_age_years: 3,
      search_mode: 'relaxed',
      page: 1,
      limit: 3,
    }),
  })
  assert(searchRes.status === 200 && searchRes.json.ok === true, 'aligned search 200')

  console.log('[verify-wave2] PASS')
}

main().catch((e) => {
  console.error('[verify-wave2] FAIL', e)
  process.exit(1)
})
