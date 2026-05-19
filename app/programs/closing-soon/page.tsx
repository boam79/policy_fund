import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { SITE_NAME, getSiteUrl } from '@/lib/site-config'
import { fetchRecommendedPrograms } from '@/lib/home/recommendations'
import { stripHtmlToText } from '@/lib/utils/stripHtml'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const revalidate = 3600

export const metadata: Metadata = {
  title: '마감 임박 지원사업',
  description: '7일 이내 마감되는 정부·지자체 지원사업 공고 목록',
  alternates: { canonical: `${getSiteUrl()}/programs/closing-soon` },
}

export default async function ClosingSoonProgramsPage() {
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const programs = await fetchRecommendedPrograms(supabase, 30)
  const closing = programs.filter((p) => p.days_left !== null && p.days_left <= 14 && p.days_left >= 0)

  return (
    <div className="container mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-2 text-2xl font-bold">마감 임박 지원사업</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        {SITE_NAME}에 등록된 공고 중 2주 이내 마감 예정인 목록입니다.
      </p>
      {closing.length === 0 ? (
        <p className="text-muted-foreground">현재 마감 임박 공고가 없습니다.</p>
      ) : (
        <ul className="space-y-3">
          {closing.map((p) => (
            <li key={p.id} className="rounded-xl border bg-white p-4">
              <Link href={`/search/${p.id}`} className="font-medium hover:text-blue-600">
                {stripHtmlToText(p.title)}
              </Link>
              <p className="mt-1 text-xs text-muted-foreground">
                {p.region && `${p.region} · `}
                {p.days_left === 0 ? '오늘 마감' : `D-${p.days_left}`}
              </p>
            </li>
          ))}
        </ul>
      )}
      <Link href="/search?browse=1" className={cn(buttonVariants({ variant: 'outline' }), 'mt-8 inline-flex')}>
        전체 공고 검색
      </Link>
    </div>
  )
}
