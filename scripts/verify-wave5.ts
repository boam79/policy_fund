/**
 * Phase 12 Wave 5 — parse 캐시·검색 source·마감 포함 필터
 */
import { config } from 'dotenv'
import {
  searchPoolStatuses,
  PROGRAM_SEARCH_POOL_STATUSES,
} from '../lib/gov-support/tools/programSearchPool'
import { getParseCache, setParseCache } from '../lib/query/parseCache'
import type { ParseNLResult } from '../lib/query/parseNaturalLanguage'

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
  console.log('[verify-wave5]')

  assert(
    searchPoolStatuses(false).length === PROGRAM_SEARCH_POOL_STATUSES.length,
    'default pool excludes closed'
  )
  assert(searchPoolStatuses(true).includes('closed'), 'include closed adds closed status')

  const stubParsed: ParseNLResult = {
    conditions: {},
    summary: 'test',
    missing_important: [],
    raw_query: 'unit-test-query',
  }
  setParseCache('unit-test-query', { parsed: stubParsed, conditions: {} })
  assert(getParseCache('unit-test-query') != null, 'parse cache unit set/get')

  const fixedQuery = `wave5-fixed-cache-${Date.now()}`
  const first = await fetchJson('/api/query/parse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: fixedQuery }),
  })
  const second = await fetchJson('/api/query/parse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: fixedQuery }),
  })
  assert(first.status === 200 && first.json.success === true, 'parse first 200')
  const firstCached = (first.json.data as { cached?: boolean })?.cached
  assert(firstCached !== true, 'parse first not cached')
  assert(second.status === 200 && second.json.success === true, 'parse second 200')
  const secondCached = (second.json.data as { cached?: boolean })?.cached
  assert(secondCached === true, 'parse second cached (dev 서버 재시작 필요 시 cached 필드 없음)')

  const searchDefault = await fetchJson('/api/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      region: '서울',
      search_mode: 'relaxed',
      page: 1,
      limit: 3,
    }),
  })
  assert(searchDefault.status === 200 && searchDefault.json.ok === true, 'search default 200')
  assert(
    typeof searchDefault.json.source === 'string' &&
      ['db', 'api_fallback'].includes(searchDefault.json.source as string),
    'search returns source'
  )
  const filters = searchDefault.json.applied_filters as { include_closed?: boolean }
  assert(filters?.include_closed === false, 'default include_closed false')

  const searchClosed = await fetchJson('/api/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      region: '서울',
      search_mode: 'relaxed',
      include_closed: true,
      page: 1,
      limit: 3,
    }),
  })
  assert(searchClosed.status === 200, 'search include_closed 200')
  const filtersClosed = searchClosed.json.applied_filters as { include_closed?: boolean }
  assert(filtersClosed?.include_closed === true, 'include_closed in applied_filters')

  console.log('[verify-wave5] PASS')
}

main().catch((e) => {
  console.error('[verify-wave5] FAIL', e instanceof Error ? e.message : e)
  process.exit(1)
})
