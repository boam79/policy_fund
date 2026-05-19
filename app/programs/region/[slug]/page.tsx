import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PROVINCE_OPTIONS } from '@/lib/geo/regions'
import { SITE_NAME, getSiteUrl } from '@/lib/site-config'
import { runProgramSearch } from '@/lib/gov-support/tools/runProgramSearch'
import { stripHtmlToText } from '@/lib/utils/stripHtml'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const revalidate = 3600

const SLUG_TO_REGION: Record<string, string> = Object.fromEntries(
  PROVINCE_OPTIONS.map((r) => [r, r])
)

type Props = { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  return PROVINCE_OPTIONS.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const region = SLUG_TO_REGION[slug]
  if (!region) return { title: '지역 지원사업' }
  return {
    title: `${region} 지원사업·정책자금 공고`,
    description: `${region} 중소기업·창업 지원사업 공고를 ${SITE_NAME}에서 검색`,
    alternates: { canonical: `${getSiteUrl()}/programs/region/${slug}` },
  }
}

export default async function RegionProgramsPage({ params }: Props) {
  const { slug } = await params
  const region = SLUG_TO_REGION[slug]
  if (!region) notFound()

  const { result } = await runProgramSearch({ region, limit: 20, page: 1 }, 'relaxed')
  const programs = result.programs

  return (
    <div className="container mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-2 text-2xl font-bold">{region} 지원사업 공고</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        {region} 지역 모집 중인 지원사업 {programs.length}건 (최대 20건 표시)
      </p>
      {programs.length === 0 ? (
        <p className="text-muted-foreground">해당 지역 공고가 없습니다.</p>
      ) : (
        <ul className="space-y-3">
          {programs.map((p) => (
            <li key={p.id} className="rounded-xl border bg-white p-4">
              <Link href={`/search/${p.id}`} className="font-medium hover:text-blue-600">
                {stripHtmlToText(p.title)}
              </Link>
              {p.application_end_date && (
                <p className="mt-1 text-xs text-muted-foreground">마감 {p.application_end_date}</p>
              )}
            </li>
          ))}
        </ul>
      )}
      <Link
        href={`/search?region=${encodeURIComponent(region)}&browse=1`}
        className={cn(buttonVariants(), 'mt-8 inline-flex')}
      >
        {region} 공고 더 검색
      </Link>
    </div>
  )
}
