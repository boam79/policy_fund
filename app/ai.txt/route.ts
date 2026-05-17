import { buildAiTxt } from '@/lib/seo/llms-content'
import { getSiteUrl } from '@/lib/site-config'

export const dynamic = 'force-dynamic'

export function GET() {
  const body = buildAiTxt(getSiteUrl())
  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  })
}
