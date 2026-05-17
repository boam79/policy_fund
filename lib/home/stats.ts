import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

export type HomeStats = {
  totalPrograms: number
  sourceCount: number
  closingWithin7Days: number
}

const SOURCES = ['bizinfo', 'kstartup', 'smes24'] as const

export async function fetchHomeStats(
  supabase: SupabaseClient<Database>
): Promise<HomeStats> {
  const today = new Date().toISOString().slice(0, 10)
  const sevenDays = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)

  const base = supabase
    .from('support_programs')
    .select('id', { count: 'exact', head: true })
    .eq('visibility_status', 'visible')
    .in('status', ['active', 'closing_soon'])
    .gte('application_end_date', today)

  const [{ count: totalPrograms }, { count: closingWithin7Days }] = await Promise.all([
    base,
    supabase
      .from('support_programs')
      .select('id', { count: 'exact', head: true })
      .eq('visibility_status', 'visible')
      .gte('application_end_date', today)
      .lte('application_end_date', sevenDays),
  ])

  const sourceResults = await Promise.all(
    SOURCES.map((source) =>
      supabase
        .from('support_programs')
        .select('id', { count: 'exact', head: true })
        .eq('visibility_status', 'visible')
        .eq('source', source)
        .gte('application_end_date', today)
        .then((r) => (r.count ?? 0) > 0)
    )
  )

  return {
    totalPrograms: totalPrograms ?? 0,
    sourceCount: sourceResults.filter(Boolean).length,
    closingWithin7Days: closingWithin7Days ?? 0,
  }
}
