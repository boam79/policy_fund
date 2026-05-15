import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const [programs, syncLogs, searches, eligibility, inquiries] = await Promise.all([
      supabase.from('support_programs').select('status', { count: 'exact' }),
      supabase.from('api_sync_logs').select('*').order('created_at', { ascending: false }).limit(5),
      supabase.from('search_sessions').select('id', { count: 'exact' }),
      supabase.from('eligibility_checks').select('id', { count: 'exact' }),
      supabase.from('customer_inquiries').select('id,status', { count: 'exact' }).eq('status', 'open'),
    ])

    const byStatus = (programs.data ?? []).reduce<Record<string, number>>((acc, p) => {
      acc[p.status ?? 'unknown'] = (acc[p.status ?? 'unknown'] ?? 0) + 1
      return acc
    }, {})

    return Response.json({
      ok: true,
      kpi: {
        totalPrograms: programs.count ?? 0,
        activePrograms: byStatus['active'] ?? 0,
        closingSoon: byStatus['closing_soon'] ?? 0,
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
