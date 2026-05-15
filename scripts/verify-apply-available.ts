#!/usr/bin/env tsx
/**
 * “검색 노출 풀”(통합 검색 기본 조건) 건수 vs unifiedSearch 의 total 과 DB 전체 행 비교.
 *
 * - 풀(완화): active|closing_soon + visible + (마감일 ≥ 오늘 또는 미기재)
 * - 풀(엄격): 위 + (접수 시작일이 null 이거나 오늘 이전)
 *
 * 실행: npm run verify:apply
 */

 
export {}

import { config } from 'dotenv'
import path from 'path'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database.types'
import {
  countProgramSearchPool,
  countProgramSearchPoolAcceptedOpen,
  todayISODate,
} from '@/lib/gov-support/tools/programSearchPool'
import { unifiedSearch } from '@/lib/gov-support/tools/unifiedSearch'

config({ path: path.resolve(process.cwd(), '.env.local') })

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    console.error('NEXT_PUBLIC_SUPABASE_URL 과 Supabase 키가 필요합니다.')
    process.exit(1)
  }

  const supabase = createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const today = todayISODate()

  const [{ count: totalRows, error: totalErr }] = await Promise.all([
    supabase.from('support_programs').select('*', { count: 'exact', head: true }),
  ])
  if (totalErr) throw new Error(totalErr.message)

  const [poolLoose, poolStrict, searchTotal] = await Promise.all([
    countProgramSearchPool(supabase, today),
    countProgramSearchPoolAcceptedOpen(supabase, today),
    unifiedSearch({ page: 1, limit: 1 }).then((r) => r.total),
  ])

  console.log('기준일 (서버 UTC 날짜):', today)
  console.log('')
  console.log('DB support_programs 전체 행:', totalRows ?? 0)
  console.log('검색 노출 풀 (완화·unifiedSearch 와 동일 조건):', poolLoose)
  console.log('검색 노출 풀 (엄격·접수 시작 후):             ', poolStrict)
  console.log('unifiedSearch({ page:1, limit:1 }).total :', searchTotal)
  console.log('')

  if (poolLoose !== searchTotal) {
    console.error(
      `불일치: 카운트 쿼리(${poolLoose}) 와 unifiedSearch.total(${searchTotal}) 가 같아야 합니다.`
    )
    process.exit(1)
  }
  console.log('OK — DB 직접 카운트와 unifiedSearch 의 total 이 일치합니다.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
