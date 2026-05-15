import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { name, email, category, message } = await request.json()
    if (!name || !email || !message) {
      return Response.json({ error: '필수 항목 누락' }, { status: 400 })
    }

    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    await supabase.from('customer_inquiries').insert({
      name,
      email,
      inquiry_type: category ?? '서비스 문의',
      subject: category ?? '서비스 문의',
      message,
      status: 'open',
    })

    return Response.json({ ok: true })
  } catch (e: unknown) {
    return Response.json({ error: e instanceof Error ? e.message : '오류' }, { status: 500 })
  }
}
