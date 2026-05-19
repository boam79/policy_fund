#!/usr/bin/env tsx
/**
 * 기존 support_programs — region·application_url(지역포털) 백필
 * 실행: npx tsx scripts/backfill-program-search-fields.ts
 */
/* eslint-disable no-console */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import {
  inferRegionFromProgramText,
  pickBestApplicationUrl,
} from '@/lib/gov-support/core/enrichProgram'
import { buildProgramSearchText } from '@/lib/gov-support/core/buildProgramSearchText'

const BATCH = 200

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('SUPABASE env required')

  const supabase = createClient<Database>(url, key)
  let offset = 0
  let updated = 0
  let scanned = 0

  while (true) {
    const { data, error } = await supabase
      .from('support_programs')
      .select('id, title, organization, region, application_url, raw_content, source, external_id')
      .range(offset, offset + BATCH - 1)

    if (error) throw error
    if (!data?.length) break

    for (const row of data) {
      scanned++
      const raw =
        typeof row.raw_content === 'string'
          ? (JSON.parse(row.raw_content) as Record<string, unknown>)
          : ((row.raw_content as Record<string, unknown> | null) ?? {})

      const nextRegion =
        row.region?.trim() || inferRegionFromProgramText(row.title ?? '', row.organization)
      const nextUrl = pickBestApplicationUrl(raw, row.application_url) || row.application_url

      const patch: { region?: string; application_url?: string; search_text?: string | null } = {}
      if (nextRegion && nextRegion !== (row.region ?? '')) patch.region = nextRegion
      if (nextUrl && nextUrl !== row.application_url) patch.application_url = nextUrl

      const nextSearchText = buildProgramSearchText({
        external_id: row.external_id ?? '',
        application_url: nextUrl ?? row.application_url,
        raw_content: raw,
      })
      if (nextSearchText) patch.search_text = nextSearchText

      if (Object.keys(patch).length === 0) continue

      const { error: upErr } = await supabase.from('support_programs').update(patch).eq('id', row.id)
      if (upErr) {
        console.warn('[backfill] skip', row.id, upErr.message)
        continue
      }
      updated++
    }

    offset += BATCH
    if (data.length < BATCH) break
  }

  console.log(`[backfill-program-search-fields] scanned=${scanned} updated=${updated}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
