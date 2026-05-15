import Link from 'next/link'
import { LayoutDashboard, FileText, RefreshCw, MessageSquare, Settings } from 'lucide-react'

const navItems = [
  { href: '/admin/dashboard', icon: LayoutDashboard, label: '대시보드' },
  { href: '/admin/programs', icon: FileText, label: '공고 관리' },
  { href: '/admin/sync', icon: RefreshCw, label: '동기화' },
  { href: '/admin/inquiries', icon: MessageSquare, label: '문의 관리' },
  { href: '/admin/settings', icon: Settings, label: '설정' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* 사이드바 */}
      <aside className="w-56 bg-gray-900 text-white flex flex-col fixed left-0 top-0 h-full z-40">
        <div className="p-4 border-b border-gray-700">
          <Link href="/" className="text-sm font-bold text-white">PolicyFund AI</Link>
          <p className="text-xs text-gray-400 mt-0.5">관리자 콘솔</p>
        </div>
        <nav className="flex-1 p-3">
          {navItems.map(({ href, icon: Icon, label }) => (
            <Link key={href} href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors mb-1">
              <Icon className="h-4 w-4" />{label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-700">
          <Link href="/" className="text-xs text-gray-400 hover:text-white">← 서비스로 돌아가기</Link>
        </div>
      </aside>

      {/* 메인 콘텐츠 */}
      <main className="ml-56 flex-1 min-h-screen">
        {children}
      </main>
    </div>
  )
}
