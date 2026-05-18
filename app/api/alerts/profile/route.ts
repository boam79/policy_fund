import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database.types'

type AlertUpdate = Database['public']['Tables']['alert_profiles']['Update']
type AlertInsert = Database['public']['Tables']['alert_profiles']['Insert']

export const dynamic = 'force-dynamic'

const DEFAULT_DAYS = 7

function parseStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v.map((x) => String(x).trim()).filter(Boolean)
}

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ ok: false, message: '로그인이 필요합니다.' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('alert_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    console.error('[alerts/profile GET]', error.message)
    return Response.json({ ok: false, message: '알림 설정을 불러오지 못했습니다.' }, { status: 500 })
  }

  const ext = data as Record<string, unknown> | null
  const notifyDays =
    ext && typeof ext.notify_days_before === 'number' ? ext.notify_days_before : DEFAULT_DAYS
  const notifyNew =
    ext && typeof ext.notify_new_programs === 'boolean' ? ext.notify_new_programs : true
  const lastDigest =
    ext && typeof ext.last_digest_at === 'string' ? ext.last_digest_at : null

  return Response.json({
    ok: true,
    profile: data
      ? {
          id: data.id,
          is_active: data.is_active,
          regions: data.regions ?? [],
          industries: data.industries ?? [],
          sources: data.sources ?? [],
          keywords: data.keywords ?? [],
          notify_days_before: notifyDays,
          notify_new_programs: notifyNew,
          last_digest_at: lastDigest,
        }
      : null,
  })
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ ok: false, message: '로그인이 필요합니다.' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return Response.json({ ok: false, message: '요청 형식이 올바르지 않습니다.' }, { status: 400 })
  }

  const notifyDays = Math.min(
    30,
    Math.max(1, Number(body.notify_days_before ?? DEFAULT_DAYS) || DEFAULT_DAYS)
  )

  const payload: AlertUpdate = {
    user_id: user.id,
    is_active: body.is_active !== false,
    regions: parseStringArray(body.regions),
    industries: parseStringArray(body.industries),
    sources: parseStringArray(body.sources),
    keywords: parseStringArray(body.keywords),
    updated_at: new Date().toISOString(),
    notify_days_before: notifyDays,
    notify_new_programs: body.notify_new_programs !== false,
  }

  const basePayload: AlertUpdate = {
    user_id: user.id,
    is_active: body.is_active !== false,
    regions: parseStringArray(body.regions),
    industries: parseStringArray(body.industries),
    sources: parseStringArray(body.sources),
    keywords: parseStringArray(body.keywords),
    updated_at: new Date().toISOString(),
  }

  const { data: existing } = await supabase
    .from('alert_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  let saved
  if (existing?.id) {
    const { data, error } = await supabase
      .from('alert_profiles')
      .update(payload)
      .eq('id', existing.id)
      .select()
      .single()
    if (error) {
      const { data: d2, error: e2 } = await supabase
        .from('alert_profiles')
        .update(basePayload)
        .eq('id', existing.id)
        .select()
        .single()
      if (e2) {
        console.error('[alerts/profile PUT]', e2.message)
        return Response.json({ ok: false, message: '저장에 실패했습니다.' }, { status: 500 })
      }
      saved = d2
    } else {
      saved = data
    }
  } else {
    const insertRow: AlertInsert = { ...payload, user_id: user.id }
    const { data, error } = await supabase.from('alert_profiles').insert(insertRow).select().single()
    if (error) {
      const { data: d2, error: e2 } = await supabase
        .from('alert_profiles')
        .insert({ ...basePayload, user_id: user.id })
        .select()
        .single()
      if (e2) {
        console.error('[alerts/profile PUT insert]', e2.message)
        return Response.json({ ok: false, message: '저장에 실패했습니다.' }, { status: 500 })
      }
      saved = d2
    } else {
      saved = data
    }
  }

  return Response.json({ ok: true, profile: saved })
}
