import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { Toaster } from '@/components/ui/sonner'
import SiteWideJsonLd from '@/components/seo/SiteWideJsonLd'
import { SITE_DESCRIPTION, SITE_NAME, SITE_NAME_FULL, getSiteUrl } from '@/lib/site-config'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

const siteUrl = getSiteUrl()

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: SITE_NAME_FULL,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    '지원둥지',
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
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: siteUrl,
    siteName: SITE_NAME,
    title: SITE_NAME_FULL,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_NAME_FULL,
    description: SITE_DESCRIPTION,
  },
  robots: { index: true, follow: true },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <SiteWideJsonLd />
        <Header />
        <main className="min-h-[calc(100vh-4rem)]">{children}</main>
        <Footer />
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
