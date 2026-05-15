import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const navLinks = [
  { href: '/about', label: '서비스 소개' },
  { href: '/search', label: '지원사업 찾기' },
  { href: '/documents/plan', label: '사업계획서' },
  { href: '/guide', label: '이용안내' },
]

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold text-primary">PolicyFund AI v2</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/login" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
            로그인
          </Link>
          <Link href="/signup" className={cn(buttonVariants({ size: 'sm' }))}>
            회원가입
          </Link>
        </div>
      </div>
    </header>
  )
}
