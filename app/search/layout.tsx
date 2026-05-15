import type { Metadata } from 'next'
import { SITE_DESCRIPTION, getSiteUrl } from '@/lib/site-config'

export const metadata: Metadata = {
  title: '지원사업 검색',
  description:
    `지역·업종·키워드로 한국 중소기업·창업 지원사업을 검색합니다. 공공 데이터 기반. ${SITE_DESCRIPTION.slice(0, 80)}…`,
  alternates: { canonical: `${getSiteUrl()}/search` },
  openGraph: {
    title: '지원사업 검색 | PolicyFund AI',
    url: `${getSiteUrl()}/search`,
    description: SITE_DESCRIPTION,
  },
}

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children
}
