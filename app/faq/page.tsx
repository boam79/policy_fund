import type { Metadata } from 'next'
import FaqAccordion from '@/app/faq/FaqAccordion'
import FaqPageJsonLd from '@/components/seo/FaqPageJsonLd'
import GeoSourceSummary from '@/components/geo/GeoSourceSummary'
import { SITE_FAQ_SECTIONS, getAllFaqPairsForSchema } from '@/lib/content/site-faq'
import { SITE_DESCRIPTION, SITE_NAME_FULL, SITE_NAME, getSiteUrl } from '@/lib/site-config'

export const metadata: Metadata = {
  title: '자주 묻는 질문',
  description: `${SITE_NAME_FULL} FAQ. ${SITE_DESCRIPTION}`,
  alternates: { canonical: `${getSiteUrl()}/faq` },
  openGraph: {
    title: `자주 묻는 질문 | ${SITE_NAME}`,
    description: SITE_DESCRIPTION,
    url: `${getSiteUrl()}/faq`,
    siteName: SITE_NAME,
    locale: 'ko_KR',
    type: 'website',
  },
}

export default function FaqPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <FaqPageJsonLd faqs={getAllFaqPairsForSchema()} />
      <section className="border-b bg-white py-12">
        <div className="container mx-auto max-w-3xl px-4 text-center">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">자주 묻는 질문</h1>
          <p className="text-gray-500">궁금한 점을 먼저 확인해보세요</p>
          <div className="mx-auto mt-6 max-w-2xl text-left">
            <GeoSourceSummary variant="compact" />
          </div>
        </div>
      </section>
      <FaqAccordion sections={SITE_FAQ_SECTIONS} />
    </div>
  )
}
