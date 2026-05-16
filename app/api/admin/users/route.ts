import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { isAdminUser } from '@/lib/auth/admin'
import { normalizePlanId, type PlanId } from '@/lib/billing/plans'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 })
  }

  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) {
    return NextResponse.json(
      { error: '회원 목록 조회에는 SUPABASE_SERVICE_ROLE_KEY가 서버에 설정되어 있어야 합니다.' },
      { status: 503 }
    )
  }

  const admin = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { searchParams } = request.nextUrl
  const q = (searchParams.get('q') ?? '').trim().toLowerCase()
  const page = Math.min(Math.max(Number(searchParams.get('page')) || 1, 1), 500)
  const perPage = Math.min(Math.max(Number(searchParams.get('perPage')) || 50, 10), 100)

  const { data: subs } = await admin
    .from('subscriptions')
    .select('user_id,plan_code,plan,status,current_period_end,cancel_at_period_end,updated_at')
    .order('updated_at', { ascending: false })

  const subByUser: Record<
    string,
    {
      plan_code: PlanId
      raw_plan: string | null
      status: string
      current_period_end: string | null
      cancel_at_period_end: boolean | null
      updated_at: string
    }
  > = {}
  for (const s of subs ?? []) {
    const uid = s.user_id
    if (!uid || subByUser[uid]) continue
    subByUser[uid] = {
      plan_code: normalizePlanId(String(s.plan_code ?? s.plan ?? 'free')) as PlanId,
      raw_plan: s.plan_code ?? s.plan,
      status: s.status,
      current_period_end: s.current_period_end,
      cancel_at_period_end: s.cancel_at_period_end,
      updated_at: s.updated_at,
    }
  }

  type Row = {
    id: string
    email: string
    created_at: string
    last_sign_in_at: string | null
    plan: PlanId
    subscription_status: string | null
    current_period_end: string | null
    cancel_at_period_end: boolean | null
  }

  const mapUser = (u: { id: string; email?: string | null; created_at: string; last_sign_in_at?: string | null }) => {
    const sub = u.id ? subByUser[u.id] : undefined
    const row: Row = {
      id: u.id,
      email: u.email ?? '',
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
      plan: sub?.plan_code ?? 'free',
      subscription_status: sub?.status ?? null,
      current_period_end: sub?.current_period_end ?? null,
      cancel_at_period_end: sub?.cancel_at_period_end ?? null,
    }
    return row
  }

  let rows: Row[] = []
  let hasMore = false
  let scannedAuthPages = 0

  if (q) {
    const maxMatches = 150
    const maxAuthPages = 30
    for (let p = 1; p <= maxAuthPages && rows.length < maxMatches; p += 1) {
      scannedAuthPages = p
      const { data, error } = await admin.auth.admin.listUsers({ page: p, perPage: 100 })
      if (error || !data?.users?.length) break
      for (const u of data.users) {
        const email = (u.email ?? '').toLowerCase()
        if (!email.includes(q)) continue
        rows.push(mapUser(u))
        if (rows.length >= maxMatches) break
      }
      if (data.users.length < 100) break
    }
    hasMore = false
  } else {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    scannedAuthPages = page
    if (error) {
      return NextResponse.json({ error: error.message || '회원 목록을 불러오지 못했습니다.' }, { status: 500 })
    }
    rows = (data?.users ?? []).map(mapUser)
    hasMore = (data?.users?.length ?? 0) === perPage
  }

  const userIds = rows.map((u) => u.id).filter(Boolean)
  const usageByUser: Record<string, { eligibility_check: number; document_generate: number; evaluation: number }> = {}
  if (userIds.length) {
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)
    const iso = startOfMonth.toISOString()

    const { data: events } = await admin
      .from('usage_events')
      .select('user_id,event_type')
      .gte('created_at', iso)
      .in('user_id', userIds)

    for (const uid of userIds) {
      usageByUser[uid] = { eligibility_check: 0, document_generate: 0, evaluation: 0 }
    }
    for (const ev of events ?? []) {
      const uid = ev.user_id
      if (!uid || !usageByUser[uid]) continue
      if (ev.event_type === 'eligibility_check') usageByUser[uid].eligibility_check += 1
      else if (ev.event_type === 'document_generate') usageByUser[uid].document_generate += 1
      else if (ev.event_type === 'evaluation') usageByUser[uid].evaluation += 1
    }
  }

  return NextResponse.json({
    users: rows.map((u) => ({
      ...u,
      usage: usageByUser[u.id] ?? { eligibility_check: 0, document_generate: 0, evaluation: 0 },
    })),
    page: q ? 1 : page,
    perPage: q ? rows.length : perPage,
    hasMore,
    query: q || null,
    scannedAuthPages,
  })
}
