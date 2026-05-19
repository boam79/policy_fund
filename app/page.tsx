import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import type { Metadata } from 'next'
import { SITE_DESCRIPTION, SITE_NAME_FULL, getSiteUrl } from '@/lib/site-config'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { fetchRecommendedPrograms } from '@/lib/home/recommendations'
import { HOME_GUEST_PROGRAM_LIMIT } from '@/lib/home/program-display'
import { fetchHomeStats } from '@/lib/home/stats'
import { fetchMemberHomeData } from '@/lib/home/member-feed'
import GuestHomeView from '@/components/home/GuestHomeView'
import MemberHomeView from '@/components/home/MemberHomeView'

export const metadata: Metadata = {
  alternates: { canonical: getSiteUrl() },
  openGraph: {
    url: getSiteUrl(),
    title: SITE_NAME_FULL,
    description: SITE_DESCRIPTION,
  },
}

export const revalidate = 1800

function publicSupabase() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

function resolveDisplayName(
  user: { email?: string | null; user_metadata?: Record<string, unknown> },
  companyName?: string | null
): string {
  if (companyName?.trim()) return companyName.trim()
  const meta = user.user_metadata
  const full = typeof meta?.full_name === 'string' ? meta.full_name : typeof meta?.name === 'string' ? meta.name : null
  if (full?.trim()) return full.trim()
  const email = user.email?.split('@')[0]
  return email?.trim() || '회원'
}

export default async function HomePage() {
  const supabaseAuth = await createServerClient()
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser()

  const pub = publicSupabase()

  if (!user) {
    const [stats, programs] = await Promise.all([
      fetchHomeStats(pub),
      fetchRecommendedPrograms(pub, HOME_GUEST_PROGRAM_LIMIT),
    ])
    return <GuestHomeView stats={stats} programs={programs} />
  }

  const memberData = await fetchMemberHomeData(user.id)
  const displayName = resolveDisplayName(user, memberData.profile?.company_name)

  return <MemberHomeView displayName={displayName} userId={user.id} memberData={memberData} />
}
