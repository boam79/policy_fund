#!/usr/bin/env tsx
/**
 * POST /api/query/parse 레이트리밋만 검증합니다.
 * verify:strict에 넣지 않음: 동일 프로세스 60초 창이 꽉 차면 직후 verify:story US-01b가 429로 실패할 수 있음.
 * 실행: npm run verify:parse-rate (dev 서버 기동 후, 필요 시 단독 실행)
 */
/* eslint-disable no-console */
export {}

const BASE = process.env.STORY_BASE_URL ?? 'http://localhost:3000'

async function run() {
  console.log(`[verify-parse-rate] base=${BASE}`)
  const parseCodes: number[] = []
  for (let i = 0; i < 24; i += 1) {
    const res = await fetch(`${BASE}/api/query/parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: `레이트리밋 검증 ${i}` }),
    })
    parseCodes.push(res.status)
  }
  if (!parseCodes.some((c) => c === 429)) {
    throw new Error('expected at least one 429 from /api/query/parse rate limit')
  }
  console.log('[verify-parse-rate] PASS')
}

run().catch((e) => {
  console.error('[verify-parse-rate] FAIL', e instanceof Error ? e.message : e)
  process.exit(1)
})
