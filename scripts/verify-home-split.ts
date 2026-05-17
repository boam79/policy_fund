/**
 * 홈 분기(비로그인/로그인) 데이터 레이어 스모크
 * 실행: npx tsx scripts/verify-home-split.ts
 */
/* eslint-disable no-console */

import { createClient } from '@supabase/supabase-js'
import { fetchHomeStats } from '../lib/home/stats'
import { fetchRecommendedPrograms } from '../lib/home/recommendations'
import { fetchMemberHomeData } from '../lib/home/member-feed'

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) {
    console.error('NEXT_PUBLIC_SUPABASE_* required')
    process.exit(1)
  }

  const pub = createClient(url, anon)

  const stats = await fetchHomeStats(pub)
  console.log('[guest] stats', stats)
  if (stats.totalPrograms < 0) throw new Error('invalid totalPrograms')

  const programs = await fetchRecommendedPrograms(pub, 4)
  console.log('[guest] programs', programs.length)

  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const probe = await pub.auth.admin.listUsers({ perPage: 1 })
    const user = probe.data.users?.[0]
    if (user) {
      const member = await fetchMemberHomeData(user.id)
      console.log('[member] profile', Boolean(member.profile))
      console.log('[member] spotlight', member.spotlightPrograms.length)
      console.log('[member] closingSoon', member.closingSoon.length)
      console.log('[member] personalizedFromProfile', member.personalizedFromProfile)
    } else {
      console.log('[member] skip — no users in project')
    }
  } else {
    console.log('[member] skip — no SUPABASE_SERVICE_ROLE_KEY for profile search test')
  }

  console.log('verify-home-split OK')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
