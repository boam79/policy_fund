import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import type { NormalizedProgram } from '@/lib/gov-support/core/normalizer'
import { inferIndustryTags } from '@/lib/industry/inferIndustryTags'
import { enrichNormalizedProgram } from '@/lib/gov-support/core/enrichProgram'

export function programToUpsertRow(p: NormalizedProgram) {
  const enriched = enrichNormalizedProgram(p)
  const industry_tags = inferIndustryTags({
    title: enriched.title,
    industry: enriched.industry,
    eligibility_text: enriched.eligibility_text,
    support_type: enriched.support_type,
  })
  return {
    source: enriched.source,
    external_id: enriched.external_id,
    title: enriched.title,
    organization: enriched.organization,
    region: enriched.region,
    industry: enriched.industry,
    industry_tags: industry_tags.length > 0 ? industry_tags : null,
    support_type: enriched.support_type,
    support_amount_min_krw: enriched.support_amount_min_krw,
    support_amount_max_krw: enriched.support_amount_max_krw,
    application_start_date: enriched.application_start_date,
    application_end_date: enriched.application_end_date,
    eligibility_text: enriched.eligibility_text,
    exclusion_text: enriched.exclusion_text,
    required_docs: enriched.required_docs,
    application_url: enriched.application_url,
    raw_content: JSON.stringify(enriched.raw_content),
    status: enriched.status,
    visibility_status: 'visible' as const,
    synced_at: new Date().toISOString(),
  }
}

export async function upsertOpenPrograms(
  supabase: SupabaseClient<Database>,
  programs: NormalizedProgram[],
  errors: string[] = []
): Promise<number> {
  const openItems = programs.filter((p) => p.status !== 'closed' && p.external_id)
  let upsertedCount = 0
  const BATCH = 50

  for (let i = 0; i < openItems.length; i += BATCH) {
    const batch = openItems.slice(i, i + BATCH)
    const rows = batch.map(programToUpsertRow)
    const { error } = await supabase
      .from('support_programs')
      .upsert(rows, { onConflict: 'source,external_id' })

    if (error) {
      errors.push(`upsert 배치 ${i}-${i + BATCH}: ${error.message}`)
    } else {
      upsertedCount += batch.length
    }
  }

  return upsertedCount
}
