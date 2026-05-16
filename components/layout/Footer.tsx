import Image from 'next/image'
import Link from 'next/link'
import { SITE_NAME } from '@/lib/site-config'

const footerSections = [
  {
    title: '서비스',
    links: [
      { href: '/about', label: '서비스 소개' },
      { href: '/search', label: '지원사업 찾기' },
      { href: '/documents/plan', label: '사업계획서 생성' },
      { href: '/guide', label: '이용안내' },
      { href: '/pricing', label: '요금제' },
    ],
  },
  {
    title: '약관·고지',
    links: [
      { href: '/terms', label: '이용약관' },
      { href: '/privacy', label: '개인정보처리방침' },
      { href: '/disclaimer', label: '면책 및 법적 고지' },
      { href: '/refund-policy', label: '환불정책' },
    ],
  },
  {
    title: '고객지원',
    links: [
      { href: '/contact', label: '고객센터' },
      { href: '/faq', label: '자주 묻는 질문' },
      { href: '/contact?type=error', label: '오류 신고' },
      { href: '/contact?type=partnership', label: '제휴/컨설턴트 문의' },
    ],
  },
]

export default function Footer() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="container mx-auto max-w-7xl px-4 py-12">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <Image
                src="/jiwondungji-logo-mark.png"
                alt={`${SITE_NAME} 로고`}
                width={40}
                height={40}
                className="h-10 w-10 shrink-0 rounded-lg object-contain"
              />
              <span className="text-lg font-bold text-foreground">{SITE_NAME}</span>
            </Link>
            <p className="mt-2 text-sm text-muted-foreground">
              정부지원사업 공고 검색·매칭과 참고용 자격 확인·문서 초안을 돕는 서비스
            </p>
          </div>
          {footerSections.map((section) => (
            <div key={section.title}>
              <p className="mb-3 text-sm font-semibold text-foreground">{section.title}</p>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-8 border-t pt-6 text-center text-xs text-muted-foreground">
          <p>© 2026 {SITE_NAME}. 저작권자 Boam79.</p>
          <p className="mt-1">
            본 서비스의 자격판정 및 추천 결과는 참고용이며, 실제 선정 여부는 주관기관 심사 기준에 따릅니다.
          </p>
        </div>
      </div>
    </footer>
  )
}
