import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Calendar, Building2, MapPin, ExternalLink } from 'lucide-react'
import type { RecommendedProgram } from '@/app/api/home/recommendations/route'
import { stripHtmlToText } from '@/lib/utils/stripHtml'

interface Props {
  program: RecommendedProgram
}

const SOURCE_LABEL: Record<string, string> = {
  bizinfo: '기업마당',
  kstartup: 'K-Startup',
  smes24: '중소벤처24',
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  active: { label: '모집중', className: 'bg-green-100 text-green-700 border-green-200' },
  closing_soon: { label: '마감임박', className: 'bg-red-100 text-red-700 border-red-200 animate-pulse' },
}

export default function ProgramBannerCard({ program }: Props) {
  const badge = STATUS_BADGE[program.status] ?? STATUS_BADGE.active
  const sourceLabel = SOURCE_LABEL[program.source] ?? program.source

  return (
    <Card className="hover:shadow-md transition-shadow duration-200 border-border/60 h-full flex flex-col">
      <CardContent className="p-4 flex flex-col gap-3 h-full">
        {/* 상단: 출처 + 상태 배지 */}
        <div className="flex items-center justify-between gap-2">
          <Badge variant="outline" className="text-xs text-muted-foreground font-normal">
            {sourceLabel}
          </Badge>
          <Badge variant="outline" className={`text-xs font-medium ${badge.className}`}>
            {badge.label}
            {program.days_left !== null && program.days_left <= 7 && (
              <span className="ml-1">D-{program.days_left}</span>
            )}
          </Badge>
        </div>

        {/* 공고명 */}
        <h3 className="font-semibold text-sm leading-snug text-foreground line-clamp-2 flex-1">
          {stripHtmlToText(program.title)}
        </h3>

        {/* 메타 정보 */}
        <div className="space-y-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{program.organization ? stripHtmlToText(program.organization) : ''}</span>
          </div>

          {program.region && (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span>{program.region ? stripHtmlToText(program.region) : ''}</span>
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

        {/* 신청 버튼 */}
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
  )
}
