import type { MetadataRoute } from 'next'
import { getSiteUrl } from '@/lib/site-config'

/** 배포별 URL이 아닌 프로덕션 기준 URL을 요청 시점에 계산 */
export const dynamic = 'force-dynamic'

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl()
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/', '/mypage/', '/manage/', '/billing/'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  }
}
