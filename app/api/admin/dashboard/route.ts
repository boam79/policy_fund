import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { isAdminUser } from '@/lib/auth/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    if (!(await isAdminUser())) {
      return Response.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 })
    }

    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const [totalPrograms, activePrograms, closingSoon, syncLogs, searches, eligibility, inquiries] =
      await Promise.all([
        supabase.from('support_programs').select('*', { count: 'exact', head: true }),
        supabase.from('support_programs').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('support_programs').select('*', { count: 'exact', head: true }).eq('status', 'closing_soon'),
        supabase.from('api_sync_logs').select('*').order('created_at', { ascending: false }).limit(5),
        supabase.from('search_sessions').select('id', { count: 'exact', head: true }),
        supabase.from('eligibility_checks').select('id', { count: 'exact', head: true }),
        supabase.from('customer_inquiries').select('id', { count: 'exact', head: true }).eq('status', 'open'),
      ])

    return Response.json({
      ok: true,
      kpi: {
        totalPrograms: totalPrograms.count ?? 0,
        activePrograms: activePrograms.count ?? 0,
        closingSoon: closingSoon.count ?? 0,
        totalSearches: searches.count ?? 0,
        totalEligibility: eligibility.count ?? 0,
        openInquiries: inquiries.count ?? 0,
      },
      recentSyncs: syncLogs.data ?? [],
    })
  } catch (e: unknown) {
    return Response.json({ error: e instanceof Error ? e.message : '오류' }, { status: 500 })
  }
}
