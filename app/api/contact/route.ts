import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { takeRateLimit } from '@/lib/security/rateLimit'

export const dynamic = 'force-dynamic'

function normalizeInquiryType(category?: string): 'general' | 'partnership' {
  const raw = (category ?? '').toLowerCase()
  if (raw.includes('제휴') || raw.includes('컨설턴트') || raw.includes('partnership')) {
    return 'partnership'
  }
  return 'general'
}

function clip(s: unknown, max: number): string {
  const t = typeof s === 'string' ? s.trim() : ''
  if (!t) return ''
  return t.length > max ? t.slice(0, max) : t
}

export async function POST(request: NextRequest) {
  try {
    const rate = takeRateLimit(request, 'api:contact', { windowMs: 60_000, max: 6 })
    if (!rate.ok) {
      return Response.json(
        { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
        { status: 429, headers: { 'Retry-After': String(rate.retryAfterSec) } }
      )
    }

    const { name, email, category, message } = await request.json()
    const nameCl = clip(name, 120)
    const emailCl = clip(email, 254)
    const messageCl = clip(message, 8000)
    const categoryCl = clip(category, 120)

    if (!nameCl || !emailCl || !messageCl) {
      return Response.json({ error: '필수 항목 누락' }, { status: 400 })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailCl)) {
      return Response.json({ error: '이메일 형식이 올바르지 않습니다.' }, { status: 400 })
    }

    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { error } = await supabase.from('customer_inquiries').insert({
      name: nameCl,
      email: emailCl,
      inquiry_type: normalizeInquiryType(categoryCl),
      subject: categoryCl || '서비스 문의',
      message: messageCl,
      status: 'received',
    })
    if (error) {
      console.error('[api/contact]', error)
      return Response.json({ error: '문의 저장에 실패했습니다. 잠시 후 다시 시도해주세요.' }, { status: 500 })
    }

    return Response.json({ ok: true })
  } catch (e: unknown) {
    console.error('[api/contact]', e)
    return Response.json({ error: '요청 처리에 실패했습니다.' }, { status: 500 })
  }
}
