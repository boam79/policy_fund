import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { Toaster } from '@/components/ui/sonner'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'PolicyFund AI v2 — 정책자금 AI 컨설턴트',
  description:
    '실제 공공 데이터 기반으로 정부지원사업을 검색·매칭하고, AI가 자격판정·서류체크리스트·사업계획서 초안까지 제공하는 정책자금 특화 서비스',
  keywords: ['정책자금', '정부지원', '창업지원', '중소기업', '사업계획서', 'AI'],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Header />
        <main className="min-h-[calc(100vh-4rem)]">{children}</main>
        <Footer />
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
