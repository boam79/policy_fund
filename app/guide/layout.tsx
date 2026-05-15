import type { Metadata } from 'next'
import { SITE_DESCRIPTION, getSiteUrl } from '@/lib/site-config'

export const metadata: Metadata = {
  title: '이용안내',
  description: `PolicyFund AI 이용 방법 5단계. 공고 검색, 자격 참고, 서류·사업계획서 초안. ${SITE_DESCRIPTION}`,
  alternates: { canonical: `${getSiteUrl()}/guide` },
  openGraph: {
    title: '이용안내 | PolicyFund AI',
    url: `${getSiteUrl()}/guide`,
    description: SITE_DESCRIPTION,
  },
}

export default function GuideLayout({ children }: { children: React.ReactNode }) {
  return children
}
