import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { RecommendedProgram } from '@/app/api/home/recommendations/route'
import { stripHtmlToText } from '@/lib/utils/stripHtml'
import { Building2, Calendar } from 'lucide-react'

const SOURCE_LABEL: Record<string, string> = {
  bizinfo: '기업마당',
  kstartup: 'K-Startup',
  smes24: '중소벤처24',
}

export default function MatchSpotlightCard({ program }: { program: RecommendedProgram }) {
  const sourceLabel = SOURCE_LABEL[program.source] ?? program.source

  return (
    <div className="flex h-full flex-col rounded-2xl border border-border/60 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <Badge variant="outline" className="text-xs font-normal">
          {sourceLabel}
        </Badge>
        <div
          className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-full border-4 border-blue-100 bg-blue-50"
          aria-label={`매칭 ${program.matchScore}%`}
        >
          <span className="text-lg font-black text-blue-600">{program.matchScore}</span>
          <span className="text-[10px] font-medium text-blue-500">%</span>
        </div>
      </div>

      <h3 className="mb-2 text-base font-bold leading-snug text-gray-900 line-clamp-2">
        {stripHtmlToText(program.title)}
      </h3>
      <p className="mb-3 text-xs text-muted-foreground line-clamp-2">{program.recommendReason}</p>

      <div className="mb-4 space-y-1.5 text-xs text-muted-foreground">
        {program.organization && (
          <div className="flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{stripHtmlToText(program.organization)}</span>
          </div>
        )}
        {program.application_end_date && (
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            <span>
              마감{' '}
              {new Date(program.application_end_date).toLocaleDateString('ko-KR', {
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>
        )}
      </div>

      <div className="mt-auto flex flex-wrap gap-2">
        <Link href={`/search/${program.id}`} className={cn(buttonVariants({ size: 'sm' }), 'flex-1')}>
          상세 보기
        </Link>
        {program.application_url && (
          <Link
            href={program.application_url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
          >
            공고 원문
          </Link>
        )}
      </div>
    </div>
  )
}
