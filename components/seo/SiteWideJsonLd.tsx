import JsonLd from '@/components/seo/JsonLd'
import { getSiteUrl, SITE_NAME, SITE_DESCRIPTION } from '@/lib/site-config'

export default function SiteWideJsonLd() {
  const base = getSiteUrl()
  const org = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: base,
    description: SITE_DESCRIPTION,
    sameAs: [] as string[],
  }
  const website = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: base,
    description: SITE_DESCRIPTION,
    publisher: { '@type': 'Organization', name: SITE_NAME, url: base },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${base}/search?keyword={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }
  return (
    <>
      <JsonLd data={org} />
      <JsonLd data={website} />
    </>
  )
}
