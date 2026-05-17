/**
 * 기존 support_programs 행에 industry_tags 백필
 * Usage: tsx scripts/tag-industry-batch.ts [--limit=500]
 */
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database.types'
import { inferIndustryTags } from '../lib/industry/inferIndustryTags'

config({ path: '.env.local' })

const limit = Number(process.argv.find((a) => a.startsWith('--limit='))?.split('=')[1] ?? 500)

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase env required')

  const supabase = createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data, error } = await supabase
    .from('support_programs')
    .select('id, title, industry, eligibility_text, support_type, industry_tags')
    .order('synced_at', { ascending: false, nullsFirst: false })
    .limit(limit)

  if (error) throw error
  const rows = data ?? []
  let updated = 0

  for (const row of rows) {
    const tags = inferIndustryTags({
      title: row.title,
      industry: row.industry,
      eligibility_text: row.eligibility_text,
      support_type: row.support_type,
    })
    const next = tags.length > 0 ? tags : null
    const same =
      JSON.stringify(row.industry_tags ?? []) === JSON.stringify(next ?? [])
    if (same) continue

    const { error: upErr } = await supabase
      .from('support_programs')
      .update({ industry_tags: next })
      .eq('id', row.id)
    if (upErr) {
      console.error('[tag-industry]', row.id, upErr.message)
      continue
    }
    updated++
  }

  console.log(`[tag-industry] scanned=${rows.length} updated=${updated}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
