import Link from 'next/link'
import { Bookmark } from 'lucide-react'
import type { RecommendedProgram } from '@/lib/home/recommendations'
import { stripHtmlToText } from '@/lib/utils/stripHtml'
import { formatProgramSupportAmount, boostDisplayMatchScore } from '@/lib/home/program-display'
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

function buildTags(program: RecommendedProgram): string[] {
  const tags: string[] = []
  if (program.support_type) {
    const t = stripHtmlToText(program.support_type)
    if (t) tags.push(t.length > 12 ? t.slice(0, 12) : t)
  }
  if (program.region) {
    const r = stripHtmlToText(program.region)
    if (r && !tags.includes(r)) tags.push(r.length > 8 ? r.slice(0, 8) : r)
  }
  return tags.slice(0, 3)
}

export default function GuestProgramCard({
  program,
  rankIndex = 0,
}: {
  program: RecommendedProgram
  rankIndex?: number
}) {
  const displayScore = boostDisplayMatchScore(program, { rankIndex })
  const funding = formatProgramSupportAmount(
    program.support_amount,
    program.support_amount_min_krw,
    program.support_amount_max_krw
  )
  const badge = deadlineBadge(program.days_left, program.status)
  const tags = buildTags(program)
  const summary =
    program.summary_text?.trim() ||
    program.recommendReason ||
    '중소기업·창업 지원을 위한 공공 지원사업입니다.'

  return (
    <article className="group relative flex h-full flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-3 flex items-start justify-between gap-2">
        {badge ? (
          <span className={cn('rounded-md px-2 py-0.5 text-[11px] font-bold', badge.className)}>
            {badge.label}
          </span>
        ) : (
          <span />
        )}
        <Link
          href="/login"
          className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-blue-600"
          title="로그인 후 찜하기"
          aria-label="찜하기"
        >
          <Bookmark className="h-4 w-4" />
        </Link>
      </div>

      <Link href={`/search/${program.id}`} className="flex flex-1 flex-col">
        <h3 className="mb-1.5 line-clamp-2 text-sm font-bold leading-snug text-gray-900 group-hover:text-blue-700">
          {stripHtmlToText(program.title)}
        </h3>
        {program.organization && (
          <p className="mb-2 text-xs font-medium text-blue-600 line-clamp-1">
            {stripHtmlToText(program.organization)}
          </p>
        )}
        <p className="mb-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{summary}</p>

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

        <div className="mt-auto flex items-end justify-between gap-2 border-t border-slate-100 pt-3">
          <div className="min-w-0 text-xs">
            <span className="text-muted-foreground">지원금 </span>
            <span className="font-bold text-gray-900">
              {funding ? `최대 ${funding.replace(/^최대\s*/, '')}` : '공고 확인'}
            </span>
          </div>
          <div className="flex shrink-0 flex-col items-center gap-0.5">
            <MatchScoreRing score={displayScore} />
            <span className="text-[9px] text-muted-foreground">AI 매칭</span>
          </div>
        </div>
      </Link>
    </article>
  )
}
