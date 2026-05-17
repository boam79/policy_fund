/**
 * Phase 12 Wave 3 — industry_tags·업력 파싱·검색 검증
 */
import { config } from 'dotenv'
import { inferIndustryTags } from '../lib/industry/inferIndustryTags'
import {
  parseBusinessAgeConstraints,
  profileMatchesBusinessAgeConstraints,
} from '../lib/eligibility/parseBusinessAge'
import { buildIndustrySearchPredicateOr } from '../lib/gov-support/tools/unifiedSearch'
import { runProgramSearch } from '../lib/gov-support/tools/runProgramSearch'

config({ path: '.env.local' })

const BASE = process.env.VERIFY_BASE_URL ?? 'http://localhost:3000'

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg)
}

async function fetchJson(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, init)
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>
  return { status: res.status, json }
}

async function main() {
  console.log('[verify-wave3]')

  const itTags = inferIndustryTags({
    title: '서울 스타트업 SW 개발 지원',
    industry: '정보통신',
    eligibility_text: '소프트웨어 기업 대상',
  })
  assert(itTags.includes('IT/소프트웨어'), 'inferIndustryTags IT')

  const constraints = parseBusinessAgeConstraints('창업 7년 미만 중소기업')
  assert(constraints?.maxYearsExclusive === 7, 'parse max years')
  assert(profileMatchesBusinessAgeConstraints(3, constraints) === true, 'age 3 < 7')
  assert(profileMatchesBusinessAgeConstraints(8, constraints) === false, 'age 8 >= 7')

  const pred = buildIndustrySearchPredicateOr('소프트웨어')
  assert(pred.includes('industry_tags.cs.{IT/소프트웨어}'), 'industry predicate has tags')

  const strict = await runProgramSearch(
    { region: '서울', industry: 'IT/소프트웨어', business_age_years: 3, page: 1, limit: 5 },
    'strict'
  )
  console.log('[verify-wave3] strict IT search total=%s', strict.result.total)

  const searchApi = await fetchJson('/api/search', {
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
  assert(searchApi.status === 200 && searchApi.json.ok === true, 'search API 200')

  const quality = await fetchJson('/api/admin/programs/quality')
  if (quality.status === 403) {
    console.log('[verify-wave3] quality API skip (not admin session)')
  } else {
    assert(quality.status === 200 && quality.json.ok === true, 'quality API')
    assert(typeof quality.json.total === 'number', 'quality total')
  }

  const dup = await fetchJson('/api/admin/programs/duplicates?limit=5')
  if (dup.status === 403) {
    console.log('[verify-wave3] duplicates API skip (not admin)')
  } else {
    assert(dup.status === 200 && dup.json.ok === true, 'duplicates API')
  }

  console.log('[verify-wave3] PASS')
}

main().catch((e) => {
  console.error('[verify-wave3] FAIL', e)
  process.exit(1)
})
