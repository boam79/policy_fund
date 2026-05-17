/**
 * SEO 기준 URL 검증 (로컬 빌드 후 또는 프로덕션 URL 지정)
 * 사용: npx tsx scripts/verify-seo.ts
 *      SITE_URL=https://policyfund-zeta.vercel.app npx tsx scripts/verify-seo.ts
 */
import { getSiteUrl } from '../lib/site-config'

const expected =
  process.env.SITE_URL?.trim() ||
  process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
  'https://policyfund-zeta.vercel.app'

const base = expected.replace(/\/$/, '')
const localBase = getSiteUrl().replace(/\/$/, '')

async function fetchText(path: string): Promise<string> {
  const res = await fetch(`${base}${path}`, { redirect: 'follow' })
  if (!res.ok) throw new Error(`${path} → HTTP ${res.status}`)
  return res.text()
}

function assertIncludes(haystack: string, needle: string, label: string) {
  if (!haystack.includes(needle)) {
    throw new Error(`${label}: expected to include "${needle}"`)
  }
}

async function main() {
  console.log(`Checking SEO URLs at ${base}`)
  if (process.env.VERCEL_URL && !process.env.NEXT_PUBLIC_SITE_URL) {
    console.warn(
      'WARN: NEXT_PUBLIC_SITE_URL unset in this shell — getSiteUrl() may differ from production build env.'
    )
  }
  console.log(`getSiteUrl() in this process: ${localBase}`)

  const robots = await fetchText('/robots.txt')
  assertIncludes(robots, `${base}/sitemap.xml`, 'robots.txt sitemap')
  if (/projects\.vercel\.app\/sitemap/i.test(robots)) {
    throw new Error('robots.txt still points at ephemeral *.vercel.app deployment URL')
  }

  const sitemap = await fetchText('/sitemap.xml')
  assertIncludes(sitemap, `${base}/`, 'sitemap homepage')
  assertIncludes(sitemap, `${base}/diagnosis`, 'sitemap diagnosis')

  const home = await fetchText('/')
  assertIncludes(home, '지원둥지', 'homepage brand')
  if (home.includes('rel="canonical"')) {
    assertIncludes(home, base, 'homepage canonical')
  }

  const llms = await fetchText('/llms.txt')
  assertIncludes(llms, base, 'llms.txt absolute URLs')

  console.log('OK: SEO URL checks passed')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
