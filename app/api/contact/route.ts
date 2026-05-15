import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

export const dynamic = 'force-dynamic'

function normalizeInquiryType(category?: string): 'general' | 'partnership' {
  const raw = (category ?? '').toLowerCase()
  if (raw.includes('제휴') || raw.includes('컨설턴트') || raw.includes('partnership')) {
    return 'partnership'
  }
  return 'general'
}

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

    const { error } = await supabase.from('customer_inquiries').insert({
      name,
      email,
      inquiry_type: normalizeInquiryType(category),
      subject: category ?? '서비스 문의',
      message,
      status: 'received',
    })
    if (error) {
      return Response.json({ error: `문의 저장 실패: ${error.message}` }, { status: 500 })
    }

    return Response.json({ ok: true })
  } catch (e: unknown) {
    return Response.json({ error: e instanceof Error ? e.message : '오류' }, { status: 500 })
  }
}
