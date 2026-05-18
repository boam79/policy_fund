import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { computeDaysUntilDeadline } from '@/lib/programs/deadline'

export type HomeProgramListItem = {
  id: string
  title: string
  organization: string | null
  application_end_date: string | null
  source: string | null
  daysLeft: number | null
}

export async function fetchClosingSoonList(
  supabase: SupabaseClient<Database>,
  limit = 5
): Promise<HomeProgramListItem[]> {
  const now = Date.now()
  const today = new Date(now).toISOString().slice(0, 10)
  const sevenDays = new Date(now + 7 * 86400000).toISOString().slice(0, 10)

  const { data } = await supabase
    .from('support_programs')
    .select('id,title,organization,application_end_date,source')
    .eq('visibility_status', 'visible')
    .gte('application_end_date', today)
    .lte('application_end_date', sevenDays)
    .order('application_end_date', { ascending: true })
    .limit(limit)

  if (!data?.length) return []

  return data.map((p) => ({
    id: p.id,
    title: p.title,
    organization: p.organization,
    application_end_date: p.application_end_date,
    source: p.source,
    daysLeft: computeDaysUntilDeadline(p.application_end_date, now),
  }))
}
