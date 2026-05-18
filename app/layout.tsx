import type { Metadata } from 'next'
import { Geist_Mono, Noto_Sans_KR } from 'next/font/google'
import './globals.css'
import Header from '@/components/layout/Header'
import ConditionalMain from '@/components/layout/ConditionalMain'
import PresenceHeartbeat from '@/components/presence/PresenceHeartbeat'
import ConditionalFooter from '@/components/layout/ConditionalFooter'
import { Toaster } from '@/components/ui/sonner'
import SiteWideJsonLd from '@/components/seo/SiteWideJsonLd'
import OAuthReturnHandlerBoundary from '@/components/auth/OAuthReturnHandlerBoundary'
import { BetaNoticeDialog } from '@/components/BetaNoticeDialog'
import { SITE_DESCRIPTION, SITE_NAME, SITE_NAME_FULL, getSiteUrl } from '@/lib/site-config'

/** macOS·Windows 동일 게이트용: 한글·라틴을 웹폰트로 고정하고 OS별 폰트 매칭을 줄임 */
const notoSansKR = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans-web',
  display: 'swap',
  adjustFontFallback: true,
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

const siteUrl = getSiteUrl()
const googleVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim()

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: SITE_NAME_FULL,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  alternates: { canonical: siteUrl },
  keywords: [
    '지원둥지',
    '지원둥지 검색',
    '정부지원사업',
    '정부지원사업 검색',
    '중소기업 지원',
    '창업 지원',
    '지원 공고',
    '정책자금',
    '사업계획서',
    '기업마당',
    'K-Startup',
    '중소벤처24',
    '자주묻는질문',
  ],
  applicationName: SITE_NAME,
  ...(googleVerification
    ? { verification: { google: googleVerification } }
    : {}),
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: siteUrl,
    siteName: SITE_NAME,
    title: SITE_NAME_FULL,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: '/jiwondungji-logo-mark.png',
        width: 512,
        height: 512,
        alt: SITE_NAME,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_NAME_FULL,
    description: SITE_DESCRIPTION,
    images: ['/jiwondungji-logo-mark.png'],
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  icons: {
    icon: [{ url: '/jiwondungji-logo-mark.png', type: 'image/png' }],
    apple: '/jiwondungji-logo-mark.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const fontVars = `${notoSansKR.variable} ${geistMono.variable}`
  return (
    <html lang="ko" className={fontVars}>
      <body className={notoSansKR.className}>
        <SiteWideJsonLd />
        <OAuthReturnHandlerBoundary />
        <BetaNoticeDialog />
        <PresenceHeartbeat />
        <Header />
        <ConditionalMain>{children}</ConditionalMain>
        <ConditionalFooter />
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
