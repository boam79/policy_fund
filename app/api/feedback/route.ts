import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { isAdminUser } from '@/lib/auth/admin'

export async function POST(request: NextRequest) {
  try {
    const { target_type, target_id, rating, feedback_text } = await request.json()

    if (!target_type || rating === undefined) {
      return NextResponse.json({ error: '필수 파라미터 누락' }, { status: 400 })
    }

    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()

    const admin = createAdminClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    await admin.from('feedback').insert({
      user_id: user?.id ?? null,
      target_type,
      target_id: target_id ?? null,
      rating,
      feedback_text: feedback_text ?? null,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[feedback]', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    if (!(await isAdminUser())) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') ?? '1')
    const limit = 30
    const offset = (page - 1) * limit

    const admin = createAdminClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, count } = await admin
      .from('feedback')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const [{ count: positiveCount }, { count: negativeCount }] = await Promise.all([
      admin
        .from('feedback')
        .select('*', { count: 'exact', head: true })
        .eq('rating', 1),
      admin
        .from('feedback')
        .select('*', { count: 'exact', head: true })
        .eq('rating', -1),
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
