import type { MetadataRoute } from 'next'
import { getSiteUrl } from '@/lib/site-config'

/** 크롤에 유용한 공개 페이지 (계정·관리자·결제 진입 제외) */
const PUBLIC_PATHS: {
  path: string
  priority: number
  changeFrequency: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
}[] = [
  { path: '/', priority: 1, changeFrequency: 'daily' },
  { path: '/search', priority: 0.95, changeFrequency: 'hourly' },
  { path: '/guide', priority: 0.85, changeFrequency: 'weekly' },
  { path: '/about', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/faq', priority: 0.85, changeFrequency: 'weekly' },
  { path: '/contact', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/pricing', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/evaluate', priority: 0.65, changeFrequency: 'weekly' },
  { path: '/documents/plan', priority: 0.75, changeFrequency: 'weekly' },
  { path: '/eligibility', priority: 0.6, changeFrequency: 'weekly' },
  { path: '/terms', priority: 0.4, changeFrequency: 'yearly' },
  { path: '/privacy', priority: 0.4, changeFrequency: 'yearly' },
  { path: '/disclaimer', priority: 0.5, changeFrequency: 'yearly' },
  { path: '/refund-policy', priority: 0.35, changeFrequency: 'yearly' },
]

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl()
  const now = new Date()
  return PUBLIC_PATHS.map(({ path, priority, changeFrequency }) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }))
}
