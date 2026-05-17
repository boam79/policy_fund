import { Database, Clock, Layers } from 'lucide-react'
import type { HomeStats } from '@/lib/home/stats'

function formatCount(n: number): string {
  if (n >= 10000) return `${n.toLocaleString('ko-KR')}+`
  return n.toLocaleString('ko-KR')
}

export default function HomeStatsBar({ stats }: { stats: HomeStats }) {
  const items = [
    {
      icon: Database,
      label: '모집 중 공고',
      value: stats.totalPrograms > 0 ? `${formatCount(stats.totalPrograms)}건` : '집계 중',
    },
    {
      icon: Layers,
      label: '연동 출처',
      value: `${stats.sourceCount}개`,
    },
    {
      icon: Clock,
      label: '마감 임박',
      value: stats.closingWithin7Days > 0 ? `${stats.closingWithin7Days}건 (D-7 이내)` : '없음',
    },
  ]

  return (
    <div className="mx-auto mt-6 flex max-w-3xl flex-wrap justify-center gap-3">
      {items.map(({ icon: Icon, label, value }) => (
        <div
          key={label}
          className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/90 px-4 py-2 text-sm shadow-sm"
        >
          <Icon className="h-4 w-4 text-blue-600" />
          <span className="text-muted-foreground">{label}</span>
          <span className="font-semibold text-gray-900">{value}</span>
        </div>
      ))}
    </div>
  )
}
