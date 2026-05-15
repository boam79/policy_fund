import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

const ADMIN_ONLY_EMAIL = 'pjm7908@hanmail.net'

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

    const isAdmin = user.email?.toLowerCase().trim() === ADMIN_ONLY_EMAIL
    if (!isAdmin) {
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

    return NextResponse.json({ data: data ?? [], count: count ?? 0 })
  } catch (err) {
    console.error('[feedback][GET]', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
