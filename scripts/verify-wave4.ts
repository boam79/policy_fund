/**
 * Phase 12 Wave 4 — 프로필·플랜 게이트·일일 한도 검증
 */
import { config } from 'dotenv'
import {
  planAllowsStrictSearch,
  planAllowsTabularExport,
  getPlan,
} from '../lib/billing/plans'
import { buildSearchUrlFromProfile } from '../lib/profile/business-profile-defaults'

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
  console.log('[verify-wave4]')

  const free = getPlan('free')
  assert(free.limits.parse_queries_per_day === 20, 'free parse daily limit')
  assert(free.limits.search_requests_per_day === 50, 'free search daily limit')
  assert(!planAllowsStrictSearch('free'), 'free no strict')
  assert(planAllowsStrictSearch('starter'), 'starter strict')
  assert(!planAllowsTabularExport('free'), 'free no export')
  assert(planAllowsTabularExport('pro'), 'pro export')

  const url = buildSearchUrlFromProfile({
    region: '서울',
    industry: 'IT/소프트웨어',
    business_age_years: 3,
  })
  assert(
    Boolean(url && (url.includes('region=%EC%84%9C%EC%9A%B8') || url.includes('region=서울'))),
    'profile search url region'
  )
  assert(Boolean(url?.includes('business_age_years=3')), 'profile search url age')

  const ent = await fetchJson('/api/billing/entitlements')
  assert(ent.status === 200 && ent.json.ok === true, 'entitlements 200')
  assert(ent.json.allows_strict_search === false, 'anon entitlements no strict')

  const strictAnon = await fetchJson('/api/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      region: '서울',
      industry: 'IT/소프트웨어',
      search_mode: 'strict',
      page: 1,
      limit: 3,
    }),
  })
  assert(
    strictAnon.status === 401 && strictAnon.json.error_code === 'AUTH_REQUIRED_FOR_STRICT',
    'strict search requires auth'
  )

  const relaxed = await fetchJson('/api/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      region: '서울',
      search_mode: 'relaxed',
      page: 1,
      limit: 3,
    }),
  })
  assert(relaxed.status === 200 && relaxed.json.ok === true, 'relaxed search anon ok')

  console.log('[verify-wave4] PASS')
}

main().catch((e) => {
  console.error('[verify-wave4] FAIL', e)
  process.exit(1)
})
