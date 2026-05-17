import { Database, Clock, Link2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { HomeStats } from '@/lib/home/stats'

function formatCount(n: number): string {
  if (n >= 10000) return `${n.toLocaleString('ko-KR')}+`
  return n.toLocaleString('ko-KR')
}

export default function HomeStatsBar({
  stats,
  variant = 'default',
}: {
  stats: HomeStats
  variant?: 'default' | 'guest'
}) {
  const isGuest = variant === 'guest'

  const items = [
    {
      icon: Database,
      text:
        stats.totalPrograms > 0
          ? `${formatCount(stats.totalPrograms)} 공고`
          : '공고 집계 중',
    },
    {
      icon: Link2,
      text: `${stats.sourceCount}개 출처 연동`,
    },
    {
      icon: Clock,
      text:
        stats.closingWithin7Days > 0
          ? `마감임박 ${stats.closingWithin7Days}건 (D-7 이내)`
          : '마감임박 없음',
    },
  ]

  return (
    <div
      className={cn(
        'mt-5 flex flex-wrap gap-2',
        isGuest ? 'justify-start' : 'mx-auto max-w-3xl justify-center'
      )}
    >
      {items.map(({ icon: Icon, text }) => (
        <div
          key={text}
          className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-3.5 py-2 text-sm shadow-sm"
        >
          <Icon className="h-4 w-4 text-blue-600" />
          <span className="font-medium text-gray-800">{text}</span>
        </div>
      ))}
    </div>
  )
}
