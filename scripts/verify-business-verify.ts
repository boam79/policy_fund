/**
 * 국세청 진위확인 API 스모크 테스트 (로컬)
 * npx tsx scripts/verify-business-verify.ts
 */

import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

import { statusBusinesses, validateBusinesses } from '../lib/gov-support/clients/ntsBusinessman'

async function main() {
  const key = process.env.PUBLIC_DATA_SERVICE_KEY?.trim()
  if (!key) {
    console.error('PUBLIC_DATA_SERVICE_KEY 가 .env.local 에 없습니다.')
    process.exit(1)
  }

  const sampleNo = process.env.VERIFY_B_NO?.trim() || '0000000000'
  const sampleDt = process.env.VERIFY_START_DT?.trim() || '20000101'
  const sampleNm = process.env.VERIFY_P_NM?.trim() || '테스트'

  console.log('[verify] status 조회…', sampleNo)
  const statusRows = await statusBusinesses([sampleNo])
  console.log('status:', JSON.stringify(statusRows[0] ?? {}, null, 2))

  console.log('[verify] validate 조회…')
  const validateRows = await validateBusinesses([
    { b_no: sampleNo, start_dt: sampleDt, p_nm: sampleNm },
  ])
  console.log('validate:', JSON.stringify(validateRows[0] ?? {}, null, 2))
  console.log('done')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
