#!/usr/bin/env tsx
/**
 * 3출처 동기화 검증 (동기화와 동일 fetch·정규화 기준)
 * 실행: npm run sync:verify
 * 출처 지정: npm run sync:verify -- bizinfo
 */

import { config } from 'dotenv'
import path from 'path'
import { createProgramSyncClient } from '../lib/gov-support/sync/runProgramSync'
import { runSyncVerify } from '../lib/gov-support/sync/syncVerify'
import { parseSyncSource } from '../lib/gov-support/sync/syncPolicy'

config({ path: path.resolve(process.cwd(), '.env.local') })

const sourceArg = process.argv[2]
const source = parseSyncSource(sourceArg ?? 'all')

async function main() {
  const supabase = createProgramSyncClient()
  console.log(`\n[sync:verify] source=${source}\n`)
  const summary = await runSyncVerify(supabase, { source })

  for (const s of summary.sources) {
    console.log(`── ${s.label} (${s.health})`)
    console.log(`   API ${s.api_total_ids} (모집중 ${s.api_open_ids}, 마감생략 ${s.skipped_closed})`)
    console.log(`   DB ${s.db_stored_ids} | 미저장(모집중) ${s.missing_open.length}+ | 유령 ${s.orphan_in_db.length}+`)
    if (s.truncated) console.log('   ⚠ 페이지 상한으로 API 일부만 수집')
    if (s.note) console.log(`   ${s.note}`)
  }

  console.log(`\n전체: ${summary.overall_health} | ok=${summary.ok}`)
  process.exit(summary.ok ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
