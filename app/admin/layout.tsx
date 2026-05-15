import Link from 'next/link'
import { LayoutDashboard, FileText, RefreshCw, MessageSquare, Settings, Star, CreditCard, ThumbsUp, Users } from 'lucide-react'

const navGroups = [
  {
    label: '운영',
    items: [
      { href: '/admin/dashboard', icon: LayoutDashboard, label: '대시보드' },
      { href: '/admin/programs', icon: FileText, label: '공고 관리' },
      { href: '/admin/sync', icon: RefreshCw, label: '동기화' },
      { href: '/admin/recommendations', icon: Star, label: '홈 배너 슬롯' },
    ],
  },
  {
    label: '고객',
    items: [
      { href: '/admin/users', icon: Users, label: '회원 관리' },
      { href: '/admin/inquiries', icon: MessageSquare, label: '문의 관리' },
      { href: '/admin/feedback', icon: ThumbsUp, label: '피드백' },
      { href: '/admin/billing', icon: CreditCard, label: '결제 관리' },
    ],
  },
  {
    label: '시스템',
    items: [
      { href: '/admin/settings', icon: Settings, label: '설정' },
    ],
  },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-900 flex">
      {/* 사이드바 */}
      <aside className="w-56 bg-gray-950 text-white flex flex-col fixed left-0 top-0 h-full z-40 border-r border-gray-800">
        <div className="p-4 border-b border-gray-800">
          <Link href="/" className="text-sm font-bold text-white">PolicyFund AI</Link>
          <p className="text-xs text-gray-500 mt-0.5">관리자 콘솔</p>
        </div>
        <nav className="flex-1 p-3 overflow-y-auto">
          {navGroups.map(group => (
            <div key={group.label} className="mb-4">
              <p className="text-xs text-gray-600 font-medium px-3 mb-1 uppercase tracking-wider">{group.label}</p>
              {group.items.map(({ href, icon: Icon, label }) => (
                <Link key={href} href={href}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors mb-0.5">
                  <Icon className="h-4 w-4" />{label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-800">
          <Link href="/" className="text-xs text-gray-500 hover:text-white transition-colors">← 서비스로 돌아가기</Link>
        </div>
      </aside>

      {/* 메인 콘텐츠 */}
      <main className="ml-56 flex-1 min-h-screen p-6 bg-gray-900">
        {children}
      </main>
    </div>
  )
}
