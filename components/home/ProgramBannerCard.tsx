import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Calendar, Building2, MapPin, ExternalLink } from 'lucide-react'
import type { RecommendedProgram } from '@/app/api/home/recommendations/route'
import { stripHtmlToText } from '@/lib/utils/stripHtml'
import { formatDeadlineBadgeLabel } from '@/lib/programs/deadline'
import { ProgramCardShell, ProgramSourceBadge, ProgramStatusBadge } from '@/components/home/ProgramCardShell'

interface Props {
  program: RecommendedProgram
}

export default function ProgramBannerCard({ program }: Props) {
  return (
    <ProgramCardShell className="rounded-xl">
      <Card className="border-0 shadow-none h-full flex flex-col">
        <CardContent className="p-4 flex flex-col gap-3 h-full">
          <div className="flex items-center justify-between gap-2">
            <ProgramSourceBadge source={program.source} />
            <ProgramStatusBadge status={program.status} />
          </div>

          <h3 className="font-semibold text-sm leading-snug text-foreground line-clamp-2 flex-1">
            {stripHtmlToText(program.title)}
          </h3>

          <div className="space-y-1.5 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">
                {program.organization ? stripHtmlToText(program.organization) : ''}
              </span>
            </div>

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
                  {program.days_left !== null &&
                    program.days_left <= 7 &&
                    program.days_left >= 0 && (
                      <span className="ml-1 text-red-600">
                        {formatDeadlineBadgeLabel(program.days_left) ?? `D-${program.days_left}`}
                      </span>
                    )}
                </span>
              </div>
            )}
          </div>

          {program.application_url && (
            <Link
              href={program.application_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-auto flex items-center justify-center gap-1.5 rounded-md border border-border/60 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              공고 보기
              <ExternalLink className="h-3 w-3" />
            </Link>
          )}
        </CardContent>
      </Card>
    </ProgramCardShell>
  )
}
