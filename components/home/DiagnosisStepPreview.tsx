import Link from 'next/link'
import { MapPin, Briefcase, Calendar, ChevronRight } from 'lucide-react'

const STEPS = [
  { icon: MapPin, label: '지역', desc: '시·도·시군구', href: '/diagnosis' },
  { icon: Briefcase, label: '업종', desc: '제조·IT·서비스 등', href: '/diagnosis' },
  { icon: Calendar, label: '업력', desc: '창업·운영 기간', href: '/diagnosis' },
] as const

export default function DiagnosisStepPreview() {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {STEPS.map(({ icon: Icon, label, desc, href }) => (
        <Link
          key={label}
          href={href}
          className="group flex flex-col rounded-xl border border-blue-100 bg-blue-50/50 p-4 transition-colors hover:border-blue-200 hover:bg-blue-50"
        >
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm">
            <Icon className="h-4 w-4" />
          </div>
          <span className="text-sm font-bold text-gray-900">{label}</span>
          <span className="text-xs text-muted-foreground">{desc}</span>
          <span className="mt-2 inline-flex items-center text-xs font-medium text-blue-600 opacity-0 transition-opacity group-hover:opacity-100">
            시작하기
            <ChevronRight className="ml-0.5 h-3 w-3" />
          </span>
        </Link>
      ))}
    </div>
  )
}
