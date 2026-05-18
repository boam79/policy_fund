import Link from 'next/link'
import { Bookmark } from 'lucide-react'
import type { RecommendedProgram } from '@/lib/home/recommendations'
import { stripHtmlToText } from '@/lib/utils/stripHtml'
import { formatProgramSupportAmount, guestCardMatchScore } from '@/lib/home/program-display'
import MatchScoreRing from '@/components/home/MatchScoreRing'
import { cn } from '@/lib/utils'
import {
  deadlineBadgeClassName,
  formatDeadlineBadgeLabel,
  formatDeadlineRemainingMessage,
} from '@/lib/programs/deadline'

function deadlineBadge(daysLeft: number | null, status: string) {
  if (daysLeft === null) return null
  const label = formatDeadlineBadgeLabel(daysLeft, {
    urgentSuffix: daysLeft <= 7 || status === 'closing_soon',
  })
  if (!label) return null
  return { label, className: deadlineBadgeClassName(daysLeft) }
}

function metaLabel(program: RecommendedProgram): string | null {
  if (program.region?.trim()) return stripHtmlToText(program.region)
  if (program.support_type?.trim()) return stripHtmlToText(program.support_type)
  if (program.organization?.trim()) return stripHtmlToText(program.organization)
  return null
}

export default function GuestProgramCard({
  program,
  rankIndex = 0,
  compact = false,
}: {
  program: RecommendedProgram
  rankIndex?: number
  compact?: boolean
}) {
  const displayScore = guestCardMatchScore(rankIndex)
  const funding = formatProgramSupportAmount(
    program.support_amount,
    program.support_amount_min_krw,
    program.support_amount_max_krw
  )
  const badge = deadlineBadge(program.days_left, program.status)
  const meta = metaLabel(program)
  const deadlineLine =
    formatDeadlineRemainingMessage(program.days_left) ?? program.recommendReason
  const ringSize = compact ? 36 : 48

  return (
    <article
      className={cn(
        'flex h-full flex-col border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-shadow hover:shadow-md',
        compact ? 'rounded-xl p-2.5' : 'rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)]'
      )}
    >
      <div className={cn('flex items-start justify-between gap-1.5', compact ? 'mb-2' : 'mb-3')}>
        {badge ? (
          <span
            className={cn(
              'rounded-full font-bold',
              badge.className,
              compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-[11px]'
            )}
          >
            {badge.label}
          </span>
        ) : (
          <span />
        )}
        <Link
          href="/login"
          className="text-slate-300 transition-colors hover:text-slate-500"
          title="로그인 후 찜하기"
          aria-label="찜하기"
        >
          <Bookmark className={cn(compact ? 'h-3.5 w-3.5' : 'h-4 w-4')} strokeWidth={1.75} />
        </Link>
      </div>

      <Link href={`/search/${program.id}`} className="flex min-h-0 flex-1 flex-col">
        <h3
          className={cn(
            'font-bold leading-snug text-blue-700 hover:text-blue-800',
            compact
              ? 'mb-0.5 line-clamp-2 text-[11px]'
              : 'mb-1 line-clamp-2 text-[13px]'
          )}
        >
          {stripHtmlToText(program.title)}
        </h3>

        {meta && (
          <p className={cn('text-slate-500 line-clamp-1', compact ? 'mb-0.5 text-[10px]' : 'mb-1 text-xs')}>
            {meta}
          </p>
        )}

        <p
          className={cn(
            'text-slate-500 line-clamp-1',
            compact ? 'mb-2 text-[10px] leading-snug' : 'mb-3 text-xs leading-relaxed'
          )}
        >
          {deadlineLine}
        </p>

        <div className="mt-auto flex items-end justify-between gap-1.5 pt-0.5">
          <p className={cn('min-w-0 text-slate-500', compact ? 'text-[10px]' : 'text-[11px]')}>
            <span className="text-slate-400">지원금 </span>
            <span className="font-semibold text-slate-700">{funding ?? '공고 확인'}</span>
          </p>
          <div className="flex shrink-0 flex-col items-center gap-0">
            <MatchScoreRing score={displayScore} size={ringSize} />
            <span className={cn('font-medium text-slate-500', compact ? 'text-[8px]' : 'text-[9px]')}>
              AI 매칭
            </span>
          </div>
        </div>
      </Link>
    </article>
  )
}
