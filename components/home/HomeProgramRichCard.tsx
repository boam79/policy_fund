import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { RecommendedProgram } from '@/lib/home/recommendations'
import { stripHtmlToText } from '@/lib/utils/stripHtml'
import { formatProgramSupportAmount, boostDisplayMatchScore } from '@/lib/home/program-display'
import { Building2, Calendar, MapPin, ExternalLink } from 'lucide-react'

const SOURCE_LABEL: Record<string, string> = {
  bizinfo: '기업마당',
  kstartup: 'K-Startup',
  smes24: '중소벤처24',
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  active: { label: '모집중', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  closing_soon: { label: '마감임박', className: 'bg-red-50 text-red-700 border-red-200' },
}

type Variant = 'guest' | 'member'

interface Props {
  program: RecommendedProgram
  variant?: Variant
  rankIndex?: number
  personalized?: boolean
}

export default function HomeProgramRichCard({
  program,
  variant = 'guest',
  rankIndex = 0,
  personalized = false,
}: Props) {
  const sourceLabel = SOURCE_LABEL[program.source] ?? program.source
  const statusBadge = STATUS_BADGE[program.status] ?? STATUS_BADGE.active
  const displayScore = boostDisplayMatchScore(program, { rankIndex, personalized })
  const funding = formatProgramSupportAmount(
    program.support_amount,
    program.support_amount_min_krw,
    program.support_amount_max_krw
  )
  const isMember = variant === 'member'

  return (
    <article
      className={cn(
        'flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-white shadow-sm transition-shadow hover:shadow-md',
        isMember && 'ring-1 ring-blue-100/80'
      )}
    >
      <div
        className={cn(
          'relative h-20 bg-gradient-to-r from-blue-500/90 to-indigo-500/80',
          isMember ? 'h-24' : 'h-16'
        )}
      >
        <div className="absolute right-3 top-3 flex h-12 w-12 flex-col items-center justify-center rounded-full border-[3px] border-white/90 bg-white/95 shadow-sm">
          <span className="text-sm font-black leading-none text-blue-600">{displayScore}</span>
          <span className="text-[9px] font-semibold text-blue-500">매칭</span>
        </div>
        {program.days_left !== null && program.days_left <= 14 && (
          <span className="absolute left-3 top-3 rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-bold text-white">
            D-{program.days_left}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-[11px] font-normal">
            {sourceLabel}
          </Badge>
          <Badge variant="outline" className={cn('text-[11px] font-medium', statusBadge.className)}>
            {statusBadge.label}
          </Badge>
          {program.support_type && (
            <Badge variant="secondary" className="text-[11px] font-normal">
              {stripHtmlToText(program.support_type)}
            </Badge>
          )}
        </div>

        <h3
          className={cn(
            'mb-2 font-bold leading-snug text-gray-900 line-clamp-2',
            isMember ? 'text-base' : 'text-sm'
          )}
        >
          {stripHtmlToText(program.title)}
        </h3>

        {program.recommendReason && (
          <p className="mb-2 text-xs text-muted-foreground line-clamp-2">{program.recommendReason}</p>
        )}

        {funding && (
          <p className="mb-3 text-sm font-semibold text-blue-700">{funding}</p>
        )}

        <div className="mb-4 space-y-1 text-xs text-muted-foreground">
          {program.organization && (
            <div className="flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{stripHtmlToText(program.organization)}</span>
            </div>
          )}
          {program.region && (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span>{stripHtmlToText(program.region)}</span>
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
          <Link
            href={`/search/${program.id}`}
            className={cn(buttonVariants({ size: 'sm' }), isMember && 'flex-1')}
          >
            상세 보기
          </Link>
          {program.application_url && (
            <Link
              href={program.application_url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
            >
              {isMember ? '공고 원문' : '원문'}
              <ExternalLink className="ml-1 h-3 w-3" />
            </Link>
          )}
        </div>
      </div>
    </article>
  )
}
