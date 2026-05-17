#!/usr/bin/env tsx
/**
 * 로컬 공고 수집 스크립트
 * - 한국 공공 API (기업마당, K-Startup, 중소벤처24) 데이터를 Supabase에 upsert
 * - macOS launchd로 자동 실행 (매일 오전 9시)
 * - Vercel Pro 전환 시: vercel.json crons 활성화하면 이 스크립트 불필요
 *
 * 실행: npm run sync
 */

import { config } from 'dotenv'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

// .env.local 로드
config({ path: path.resolve(process.cwd(), '.env.local') })

import { fetchAllBizinfoPages, fetchAllKStartupPages, fetchAllSmes24Pages } from '../lib/gov-support/clients/paginatedFetch'
import {
  normalizeBizinfoItem,
  normalizeKStartupItem,
  normalizeSmes24Item,
  type NormalizedProgram,
} from '../lib/gov-support/core/normalizer'
import { deduplicate } from '../lib/gov-support/core/dedup'
import { inferIndustryTags } from '../lib/industry/inferIndustryTags'
import type { Database } from '../types/database.types'

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

async function main() {
  const startedAt = new Date().toISOString()
  console.log(`\n🚀 지원둥지 공고 수집 시작: ${new Date().toLocaleString('ko-KR')}`)

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    console.error('❌ NEXT_PUBLIC_SUPABASE_URL 또는 API 키가 .env.local에 없습니다.')
    process.exit(1)
  }

  const supabase = createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const errors: string[] = []
  const rawItems: NormalizedProgram[] = []

  // ── 기업마당 (전 페이지, bizinfo 페이지네이션 모듈) ───────────────
  console.log('\n📌 기업마당 수집 중...')
  let bizinfoCount = 0
  try {
    const bizRaw = await withRetry(() => fetchAllBizinfoPages())
    const items = bizRaw.map(normalizeBizinfoItem)
    rawItems.push(...items)
    bizinfoCount = items.length
    console.log(`  → ${bizinfoCount}건`)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '오류'
    errors.push(`bizinfo: ${msg}`)
    console.log(`  → 실패: ${msg}`)
  }

  // ── K-Startup ────────────────────────────────────────────────
  console.log('\n📌 K-Startup 수집 중...')
  let kstartupCount = 0
  try {
    const list = await withRetry(() => fetchAllKStartupPages('Y'))
    const items = list.map(normalizeKStartupItem)
    rawItems.push(...items)
    kstartupCount = items.length
    console.log(`  → ${kstartupCount}건`)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '오류'
    errors.push(`kstartup: ${msg}`)
    console.log(`  → 실패: ${msg}`)
  }

  // ── 중소벤처24 ───────────────────────────────────────────────
  console.log('\n📌 중소벤처24 수집 중...')
  let smes24Count = 0
  try {
    const list = await withRetry(() => fetchAllSmes24Pages())
    const items = list.map(normalizeSmes24Item)
    rawItems.push(...items)
    smes24Count = items.length
    console.log(`  → ${smes24Count}건`)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '오류'
    errors.push(`smes24: ${msg}`)
    console.log(`  → 실패 (IP 등록 필요): ${msg}`)
  }

  // ── 중복 제거 ────────────────────────────────────────────────
  const allItems = deduplicate(rawItems)
  const totalFetched = bizinfoCount + kstartupCount + smes24Count
  console.log(`\n🔁 중복 제거: ${totalFetched}건 → ${allItems.length}건`)

  if (allItems.length === 0) {
    console.warn('\n⚠️  수집된 데이터가 없습니다. API 키 및 네트워크를 확인하세요.')
    await logToSupabase(supabase, startedAt, 0, 0, 0, errors)
    process.exit(errors.length > 0 ? 1 : 0)
  }

  // ── Supabase upsert ──────────────────────────────────────────
  console.log('\n💾 Supabase 저장 중...')
  let upsertedCount = 0
  const BATCH = 50

  for (let i = 0; i < allItems.length; i += BATCH) {
    const batch = allItems.slice(i, i + BATCH)
    const rows = batch.map((p) => {
      const industry_tags = inferIndustryTags({
        title: p.title,
        industry: p.industry,
        eligibility_text: p.eligibility_text,
        support_type: p.support_type,
      })
      return {
      source: p.source,
      external_id: p.external_id,
      title: p.title,
      organization: p.organization,
      region: p.region,
      industry: p.industry,
      industry_tags: industry_tags.length > 0 ? industry_tags : null,
      support_type: p.support_type,
      support_amount_min_krw: p.support_amount_min_krw,
      support_amount_max_krw: p.support_amount_max_krw,
      application_start_date: p.application_start_date,
      application_end_date: p.application_end_date,
      eligibility_text: p.eligibility_text,
      exclusion_text: p.exclusion_text,
      required_docs: p.required_docs,
      application_url: p.application_url,
      raw_content: JSON.stringify(p.raw_content),
      status: p.status,
      visibility_status: p.status === 'closed' ? 'hidden' : 'visible',
      synced_at: new Date().toISOString(),
    }
    })

    const { error } = await supabase
      .from('support_programs')
      .upsert(rows, { onConflict: 'source,external_id' })

    if (error) {
      errors.push(`upsert 배치 ${i}~${i + BATCH}: ${error.message}`)
      process.stdout.write('✗')
    } else {
      upsertedCount += batch.length
      process.stdout.write('.')
    }
  }
  console.log(`\n  → ${upsertedCount}건 저장 완료`)

  // ── 로그 기록 ────────────────────────────────────────────────
  await logToSupabase(supabase, startedAt, totalFetched, upsertedCount, errors.length, errors)

  // ── 결과 요약 ────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(50))
  console.log(`✅ 수집 완료: ${new Date().toLocaleString('ko-KR')}`)
  console.log(`   기업마당 ${bizinfoCount}건 | K-Startup ${kstartupCount}건 | 중소벤처24 ${smes24Count}건`)
  console.log(`   저장: ${upsertedCount}건 | 오류: ${errors.length}건`)
  if (errors.length > 0) {
    console.log('\n⚠️  오류 목록:')
    errors.forEach((e) => console.log(`   - ${e}`))
  }
  console.log('─'.repeat(50) + '\n')

  process.exit(errors.length > 0 && upsertedCount === 0 ? 1 : 0)
}

async function logToSupabase(
  supabase: ReturnType<typeof createClient<Database>>,
  startedAt: string,
  requested: number,
  inserted: number,
  failedCount: number,
  errors: string[]
) {
  await supabase.from('api_sync_logs').insert({
    source: 'local_script',
    status: failedCount === 0 ? 'success' : inserted > 0 ? 'partial' : 'failed',
    requested_count: requested,
    inserted_count: inserted,
    updated_count: 0,
    failed_count: failedCount,
    error_message: errors.length > 0 ? errors.join('; ') : null,
    started_at: startedAt,
    ended_at: new Date().toISOString(),
  })
}

main().catch((e) => {
  console.error('❌ 스크립트 오류:', e)
  process.exit(1)
})
