import Link from 'next/link'
import { Bookmark } from 'lucide-react'
import type { RecommendedProgram } from '@/lib/home/recommendations'
import { stripHtmlToText } from '@/lib/utils/stripHtml'
import { formatProgramSupportAmount, guestCardMatchScore } from '@/lib/home/program-display'
import MatchScoreRing from '@/components/home/MatchScoreRing'
import { cn } from '@/lib/utils'

function deadlineBadge(daysLeft: number | null, status: string) {
  if (daysLeft === null) return null
  if (daysLeft <= 7 || status === 'closing_soon') {
    return { label: `D-${daysLeft} 마감임박`, className: 'bg-red-500 text-white' }
  }
  if (daysLeft <= 15) {
    return { label: `D-${daysLeft}`, className: 'bg-orange-500 text-white' }
  }
  return { label: `D-${daysLeft}`, className: 'bg-slate-500 text-white' }
}

function metaLabel(program: RecommendedProgram): string | null {
  if (program.region?.trim()) return stripHtmlToText(program.region)
  if (program.support_type?.trim()) return stripHtmlToText(program.support_type)
  if (program.organization?.trim()) return stripHtmlToText(program.organization)
  return null
}

function buildTags(program: RecommendedProgram): string[] {
  const tags: string[] = []
  const type = program.support_type ? stripHtmlToText(program.support_type) : ''
  const region = program.region ? stripHtmlToText(program.region) : ''
  if (type && type.length <= 14) tags.push(type)
  if (region && region.length <= 10 && !tags.includes(region)) tags.push(region)
  return tags.slice(0, 2)
}

export default function GuestProgramCard({
  program,
  rankIndex = 0,
}: {
  program: RecommendedProgram
  rankIndex?: number
}) {
  const displayScore = guestCardMatchScore(rankIndex)
  const funding = formatProgramSupportAmount(
    program.support_amount,
    program.support_amount_min_krw,
    program.support_amount_max_krw
  )
  const badge = deadlineBadge(program.days_left, program.status)
  const meta = metaLabel(program)
  const tags = buildTags(program)
  const deadlineLine =
    program.days_left !== null
      ? `마감이 ${program.days_left}일 남았습니다.`
      : program.recommendReason

  return (
    <article className="flex h-full flex-col rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-shadow hover:shadow-md">
      <div className="mb-3 flex items-start justify-between gap-2">
        {badge ? (
          <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-bold', badge.className)}>
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
          <Bookmark className="h-4 w-4" strokeWidth={1.75} />
        </Link>
      </div>

      <Link href={`/search/${program.id}`} className="flex flex-1 flex-col">
        <h3 className="mb-1 line-clamp-2 text-[13px] font-bold leading-snug text-blue-700 hover:text-blue-800">
          {stripHtmlToText(program.title)}
        </h3>

        {meta && <p className="mb-1 text-xs text-slate-500">{meta}</p>}

        <p className="mb-3 text-xs leading-relaxed text-slate-500">{deadlineLine}</p>

        {tags.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-600"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <p className="text-[11px] text-slate-500">
            <span className="text-slate-400">지원금 </span>
            <span className="font-semibold text-slate-700">
              {funding ?? '공고 확인'}
            </span>
          </p>
          <div className="flex flex-col items-center gap-0.5">
            <MatchScoreRing score={displayScore} size={48} />
            <span className="text-[9px] font-medium text-slate-500">AI 매칭</span>
          </div>
        </div>
      </Link>
    </article>
  )
}
