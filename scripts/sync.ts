#!/usr/bin/env tsx
/**
 * 로컬 공고 수집 — 「실질적 전부」 정책
 * - 기업마당: API totCnt 전부
 * - K-Startup: 모집 중(Y) 전부
 * - 중소벤처24: 최근 730일(기본)
 *
 * 실행: npm run sync
 * macOS launchd 매일 09:00 권장 (Vercel 무료는 페이지 상한 있음)
 */

import { config } from 'dotenv'
import path from 'path'
import { createProgramSyncClient, runProgramSync } from '../lib/gov-support/sync/runProgramSync'
import { runSyncVerify } from '../lib/gov-support/sync/syncVerify'
import { runSyncHeal, healMessage } from '../lib/gov-support/sync/syncHeal'
import { smes24LookbackDays, SYNC_POLICY } from '../lib/gov-support/sync/syncPolicy'

config({ path: path.resolve(process.cwd(), '.env.local') })

async function main() {
  console.log(`\n🚀 지원둥지 공고 수집 (실질적 전부)`)
  console.log(`   ${new Date().toLocaleString('ko-KR')}`)
  console.log(`   · ${SYNC_POLICY.bizinfo.description}`)
  console.log(`   · ${SYNC_POLICY.kstartup.description}`)
  console.log(`   · 중소벤처24 최근 ${smes24LookbackDays()}일\n`)

  let supabase
  try {
    supabase = createProgramSyncClient()
  } catch {
    console.error('❌ NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 가 .env.local 에 필요합니다.')
    process.exit(1)
  }

  const result = await runProgramSync(supabase, { source: 'all' })

  console.log(`📌 기업마당: ${result.bizinfoCount}건` +
    (result.bizinfoReportedTotal ? ` (API totCnt ${result.bizinfoReportedTotal})` : ''))
  console.log(`📌 K-Startup: ${result.kstartupCount}건`)
  console.log(`📌 중소벤처24: ${result.smes24Count}건`)
  console.log(`🔁 중복 제거 후: ${result.deduplicatedCount}건`)
  console.log(`💾 저장(모집 가능·마감임박 등): ${result.upsertedCount}건`)
  if (result.skippedClosedCount > 0) {
    console.log(`⏭️  마감 공고 ${result.skippedClosedCount}건 — 신규 DB 저장 생략`)
  }
  if (result.closedMarkedCount > 0) {
    console.log(`🏷️  기존 DB 행 ${result.closedMarkedCount}건 — 마감·비노출 갱신`)
  }

  if (result.truncated) {
    console.warn('\n⚠️  페이지 상한으로 일부만 수집되었습니다. SYNC_MAX_PAGES 를 비우고 다시 실행하세요.')
  }
  if (result.errors?.length) {
    console.warn('\n⚠️  오류:', result.errors.join('; '))
  }
  if (result.totalFetched === 0) {
    console.warn('\n⚠️  수집 0건 — API 키·네트워크를 확인하세요.')
    process.exit(1)
  }

  const runVerify = process.env.SYNC_VERIFY_AFTER !== '0'
  if (runVerify) {
    console.log('\n🔍 동기화 검증…')
    const verify = result.verify ?? (await runSyncVerify(supabase, { source: 'all' }))
    for (const s of verify.sources) {
      console.log(
        `   ${s.label}: ${s.health} | 미저장(모집중) ${s.missing_open.length}+ | 마감생략 ${s.skipped_closed}`
      )
    }
    if (verify.overall_health === 'gaps' && process.env.SYNC_HEAL_AFTER === '1') {
      console.log('\n🔧 보강 동기화…')
      const heal = await runSyncHeal(supabase, { source: 'all' })
      console.log(`   ${healMessage(heal)}`)
    }
  }

  console.log('\n✅ 완료\n')
  process.exit(result.ok ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
