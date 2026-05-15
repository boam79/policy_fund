#!/usr/bin/env tsx
/**
 * 3개 출처 API(동기화와 동일: paginatedFetch) vs DB support_programs.source 건수 비교
 *
 * 기본값: 속도 때문에 출처별 SYNC_MAX_PAGES=12 페이지만 (변경 가능)
 * 전체 무제한: VERIFY_COUNTS_FULL=1 과 함께 SYNC_MAX_PAGES 를 비우거나 큰 값을 주세요.
 *
 * 실행: npm run verify:counts
 */

/* eslint-disable no-console */
export {}

import { config } from 'dotenv'
import path from 'path'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database.types'
import {
  fetchAllBizinfoPages,
  fetchAllKStartupPages,
  fetchAllSmes24Pages,
} from '../lib/gov-support/clients/paginatedFetch'
import {
  normalizeBizinfoItem,
  normalizeKStartupItem,
  normalizeSmes24Item,
} from '../lib/gov-support/core/normalizer'
import type { NormalizedProgram } from '../lib/gov-support/core/normalizer'
import { deduplicate } from '../lib/gov-support/core/dedup'

config({ path: path.resolve(process.cwd(), '.env.local') })

if (process.env.VERIFY_COUNTS_FULL !== '1' && !process.env.SYNC_MAX_PAGES) {
  process.env.SYNC_MAX_PAGES = process.env.VERIFY_COUNTS_MAX_PAGES ?? '12'
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function withRetry<T>(fn: () => Promise<T>, retries = 2, delayMs = 1500): Promise<T> {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn()
    } catch (e) {
      if (i === retries) throw e
      await sleep(delayMs * (i + 1))
    }
  }
  throw new Error('unreachable')
}

function countBySource(programs: NormalizedProgram[]): Record<string, number> {
  const m: Record<string, number> = { bizinfo: 0, kstartup: 0, smes24: 0 }
  for (const p of programs) {
    m[p.source] = (m[p.source] ?? 0) + 1
  }
  return m
}

function uniqueExtIdsBySource(programs: NormalizedProgram[]): Record<string, number> {
  const sets: Record<string, Set<string>> = {
    bizinfo: new Set(),
    kstartup: new Set(),
    smes24: new Set(),
  }
  for (const p of programs) {
    if (p.external_id) sets[p.source]?.add(p.external_id)
  }
  return {
    bizinfo: sets.bizinfo.size,
    kstartup: sets.kstartup.size,
    smes24: sets.smes24.size,
  }
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    console.error('NEXT_PUBLIC_SUPABASE_URL 및 Supabase 키가 필요합니다.')
    process.exit(1)
  }

  const pageCap = process.env.SYNC_MAX_PAGES ?? '(설정 없음·로컬=무제한·Vercel=SAFE상한)'
  console.log(`\n[검증] 출처별 최대 페이지: ${pageCap}`)
  console.log(`  전 페이지 비교 시: VERIFY_COUNTS_FULL=1 이면서 SYNC_MAX_PAGES 미설정(또는 큰 값)\n`)

  const supabase = createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  console.log('=== 1) DB support_programs 출처별 행 수 ===\n')
  let dbTotal = 0
  for (const src of ['bizinfo', 'kstartup', 'smes24'] as const) {
    const { count, error } = await supabase
      .from('support_programs')
      .select('*', { count: 'exact', head: true })
      .eq('source', src)
    if (error) {
      console.error(`  ${src}: 조회 실패 — ${error.message}`)
    } else {
      const n = count ?? 0
      dbTotal += n
      console.log(`  ${src.padEnd(10)} ${n.toLocaleString()}건`)
    }
  }

  const { count: cntAll } = await supabase
    .from('support_programs')
    .select('*', { count: 'exact', head: true })

  console.log(`\n  표시합계 ${dbTotal.toLocaleString()}건 | COUNT(*) 전체 ${(cntAll ?? 0).toLocaleString()}건`)

  console.log('\n=== 2) paginatedFetch(동기화와 동일) → 정규화 → dedup ===\n')

  const apiErrors: string[] = []

  let bizRaw: Awaited<ReturnType<typeof fetchAllBizinfoPages>> = []
  try {
    bizRaw = await withRetry(() => fetchAllBizinfoPages())
  } catch (e: unknown) {
    apiErrors.push(`bizinfo ${e instanceof Error ? e.message : e}`)
  }

  const pair = await Promise.allSettled([
    withRetry(() => fetchAllKStartupPages('Y')),
    withRetry(() => fetchAllSmes24Pages()),
  ])

  let ksList: Awaited<ReturnType<typeof fetchAllKStartupPages>> = []
  let smList: Awaited<ReturnType<typeof fetchAllSmes24Pages>> = []

  if (pair[0].status === 'fulfilled') ksList = pair[0].value
  else apiErrors.push(`kstartup ${pair[0].reason?.message ?? pair[0].reason}`)

  if (pair[1].status === 'fulfilled') smList = pair[1].value
  else apiErrors.push(`smes24 ${pair[1].reason?.message ?? pair[1].reason}`)

  console.log(`[기업마당] 원시 ${bizRaw.length}건`)
  console.log(`[K-Startup] 원시 ${ksList.length}건`)
  console.log(`[중소벤처24] 원시 ${smList.length}건`)

  const bizinfoNorm = bizRaw.map(normalizeBizinfoItem)
  const kstartupNorm = ksList.map(normalizeKStartupItem)
  const smes24Norm = smList.map(normalizeSmes24Item)

  const combined = [...bizinfoNorm, ...kstartupNorm, ...smes24Norm]
  const uniqueKeysBeforeDedup = uniqueExtIdsBySource(combined)
  const deduped = deduplicate(combined)
  const afterDedup = countBySource(deduped)
  const blankExt = deduped.filter((p) => !String(p.external_id ?? '').trim()).length

  console.log('\n출처별 유니크 external_id(정규화 직후·dedup 전)')
  console.log(`   bizinfo ${uniqueKeysBeforeDedup.bizinfo} | kstartup ${uniqueKeysBeforeDedup.kstartup} | smes24 ${uniqueKeysBeforeDedup.smes24}`)

  console.log('\ndedupe(source:external_id) 후 출처별')
  console.log(`   bizinfo ${afterDedup.bizinfo}`)
  console.log(`   kstartup ${afterDedup.kstartup}`)
  console.log(`   smes24 ${afterDedup.smes24}`)
  console.log(`   합계 ${deduped.length}`)
  if (blankExt > 0) console.log(`   ⚠ external_id 빈 행 ${blankExt}건`)

  if (apiErrors.length > 0) {
    console.log('\n⚠ 호출 오류')
    apiErrors.forEach((e) => console.log(`   - ${e}`))
  }

  console.log('\n=== 해석 ===')
  console.log('- 검증 스크립트는 기본 페이지 상한 때문에 DB보다 적게 나올 수 있음 (VERIFY_COUNTS_FULL 등 참고)')
  console.log('- 동기화 본 실행은 로컬은 페이지 무제한(기본), Vercel은 SYNC_VERCEL_SAFE_MAX_PAGES 또는 SYNC_MAX_PAGES')
  console.log('- DB가 더 많으면 과거 누적·상한 초과 페이지·다른 기간 설정 때문일 수 있음\n')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
