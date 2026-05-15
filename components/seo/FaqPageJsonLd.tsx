import JsonLd from '@/components/seo/JsonLd'
import { getSiteUrl, SITE_NAME } from '@/lib/site-config'

export default function FaqPageJsonLd({
  faqs,
}: {
  faqs: { question: string; answer: string }[]
}) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
    url: `${getSiteUrl()}/faq`,
    name: `${SITE_NAME} 자주 묻는 질문`,
  }
  return <JsonLd data={data} />
}
