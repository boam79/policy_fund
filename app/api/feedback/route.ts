import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { isAdminUser } from '@/lib/auth/admin'
import { takeRateLimit } from '@/lib/security/rateLimit'

const FEEDBACK_TYPES = new Set([
  'program',
  'recommendation_slot',
  'inquiry',
  'feedback',
  'faq',
  'guide',
  'policy_document',
  'billing',
  'system_alert',
  'search',
  'home',
  'diagnosis',
  'evaluate',
  'documents',
])

function clip(s: unknown, max: number): string {
  const t = typeof s === 'string' ? s.trim() : ''
  return t.length > max ? t.slice(0, max) : t
}

export async function POST(request: NextRequest) {
  try {
    const rate = takeRateLimit(request, 'api:feedback:post', { windowMs: 60_000, max: 30 })
    if (!rate.ok) {
      return NextResponse.json(
        { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
        { status: 429, headers: { 'Retry-After': String(rate.retryAfterSec) } }
      )
    }

    const body = await request.json().catch(() => ({}))
    const target_type = clip(body.target_type, 64)
    const target_id = body.target_id == null || body.target_id === '' ? null : clip(body.target_id, 128)
    const rating = body.rating
    const feedback_text =
      body.feedback_text == null || body.feedback_text === '' ? null : clip(body.feedback_text, 2000)

    if (!target_type || rating === undefined || rating === null) {
      return NextResponse.json({ error: '필수 파라미터 누락' }, { status: 400 })
    }
    if (!FEEDBACK_TYPES.has(target_type)) {
      return NextResponse.json({ error: '유효하지 않은 대상 유형입니다.' }, { status: 400 })
    }
    const r = Number(rating)
    if (!Number.isInteger(r) || r < -1 || r > 1) {
      return NextResponse.json({ error: '유효하지 않은 평가값입니다.' }, { status: 400 })
    }

    const serverClient = await createClient()
    const {
      data: { user },
    } = await serverClient.auth.getUser()

    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!key) {
      return NextResponse.json({ error: '서비스 설정 오류로 피드백을 저장할 수 없습니다.' }, { status: 503 })
    }

    const admin = createAdminClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { error } = await admin.from('feedback').insert({
      user_id: user?.id ?? null,
      target_type,
      target_id,
      rating: r,
      feedback_text,
    })
    if (error) {
      console.error('[feedback]', error)
      return NextResponse.json({ error: '피드백 저장에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[feedback]', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const serverClient = await createClient()
    const {
      data: { user },
    } = await serverClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    if (!(await isAdminUser())) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const pageRaw = parseInt(searchParams.get('page') ?? '1', 10)
    const page = Number.isFinite(pageRaw) ? Math.min(500, Math.max(1, pageRaw)) : 1
    const limit = 30
    const offset = (page - 1) * limit

    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!key) {
      return NextResponse.json({ error: '관리자 조회 설정이 완료되지 않았습니다.' }, { status: 503 })
    }

    const admin = createAdminClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data, count } = await admin
      .from('feedback')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const [{ count: positiveCount }, { count: negativeCount }] = await Promise.all([
      admin.from('feedback').select('*', { count: 'exact', head: true }).eq('rating', 1),
      admin.from('feedback').select('*', { count: 'exact', head: true }).eq('rating', -1),
    ])

    return NextResponse.json({
      data: data ?? [],
      count: count ?? 0,
      stats: {
        total: count ?? 0,
        positive: positiveCount ?? 0,
        negative: negativeCount ?? 0,
        page_count: (data ?? []).length,
      },
    })
  } catch (err) {
    console.error('[feedback][GET]', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
