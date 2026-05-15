import type { Metadata } from 'next'
import { SITE_DESCRIPTION, getSiteUrl } from '@/lib/site-config'

export const metadata: Metadata = {
  title: '서비스 소개',
  description: `PolicyFund AI 정부지원사업 매칭·자격 참고·문서 초안 기능 소개. ${SITE_DESCRIPTION}`,
  alternates: { canonical: `${getSiteUrl()}/about` },
  openGraph: {
    title: '서비스 소개 | PolicyFund AI',
    url: `${getSiteUrl()}/about`,
    description: SITE_DESCRIPTION,
  },
}

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children
}
