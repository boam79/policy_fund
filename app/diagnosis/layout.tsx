import type { Metadata } from 'next'
import { SITE_DESCRIPTION, SITE_NAME, getSiteUrl } from '@/lib/site-config'

export const metadata: Metadata = {
  title: 'AI 맞춤 진단',
  description: `업력·업종·지역 등 조건으로 맞는 지원사업을 찾는 AI 맞춤 진단. ${SITE_DESCRIPTION}`,
  alternates: { canonical: `${getSiteUrl()}/diagnosis` },
  openGraph: {
    title: `AI 맞춤 진단 | ${SITE_NAME}`,
    url: `${getSiteUrl()}/diagnosis`,
    description: SITE_DESCRIPTION,
  },
}

export default function DiagnosisLayout({ children }: { children: React.ReactNode }) {
  return children
}
