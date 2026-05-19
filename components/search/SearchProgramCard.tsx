'use client'

import Link from 'next/link'
import { Building2, MapPin, Calendar, ExternalLink } from 'lucide-react'
import {
  eligibilityLabel,
  eligibilityColor,
  eligibilityPrimaryReason,
  type EligibilityStatus,
} from '@/lib/gov-support/tools/eligibility'
import type { SupportProgram } from '@/lib/gov-support/tools/unifiedSearch'
import { getProgramSourceLabel } from '@/lib/gov-support/programSources'
import { stripHtmlToText } from '@/lib/utils/stripHtml'

interface EligibilityResult {
  status: EligibilityStatus
  score: number
  passed: string[]
  failed: string[]
  unknown: string[]
}

export type SearchProgramWithEligibility = SupportProgram & {
  eligibility: EligibilityResult
  days_left: number | null
}

export default function SearchProgramCard({
  program: p,
  listQuery,
}: {
  program: SearchProgramWithEligibility
  listQuery: string
}) {
  const status = p.eligibility?.status ?? 'unknown'
  const colorClass = eligibilityColor(status)
  const label = eligibilityLabel(status)
  const primaryReason = p.eligibility
    ? eligibilityPrimaryReason(p.eligibility, {
        title: p.title,
        region: p.region,
        industry: p.industry,
        industry_tags: p.industry_tags,
        eligibility_text: p.eligibility_text,
        exclusion_text: p.exclusion_text,
        support_type: p.support_type,
      })
    : null

  const isClosingSoon =
    p.days_left !== null && p.days_left !== undefined && p.days_left <= 7 && p.days_left >= 0
  const isClosed = p.days_left !== null && p.days_left !== undefined && p.days_left < 0

  const returnSuffix = listQuery ? `?return=${encodeURIComponent(`?${listQuery}`)}` : ''
  const detailHref = `/search/${p.id}${returnSuffix}`

  return (
    <Link
      href={detailHref}
      className="block bg-white rounded-xl border hover:border-blue-300 hover:shadow-md transition-all p-5 group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
              {label}
            </span>
            {isClosed && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                마감
              </span>
            )}
            {isClosingSoon && !isClosed && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                {p.days_left === 0 ? '오늘 마감' : `D-${p.days_left}`}
              </span>
            )}
            {p.source && (
              <span className="text-xs text-gray-400">{getProgramSourceLabel(p.source)}</span>
            )}
          </div>
          <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
            {stripHtmlToText(p.title)}
          </h3>
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
            {p.organization && (
              <span className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {stripHtmlToText(p.organization)}
              </span>
            )}
            {p.region && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {stripHtmlToText(p.region)}
              </span>
            )}
            {p.application_end_date && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {p.application_end_date} 마감
              </span>
            )}
          </div>
          {p.support_type && (
            <p className="mt-1.5 text-xs text-gray-500 line-clamp-2">
              {stripHtmlToText(p.support_type, { maxLength: 220 })}
            </p>
          )}
        </div>
        <ExternalLink className="h-4 w-4 text-gray-300 group-hover:text-blue-400 flex-shrink-0 mt-1 transition-colors" />
      </div>

      {primaryReason && (
        <div className="mt-3 pt-3 border-t border-dashed">
          <p className="text-xs text-gray-600">
            <span className="font-medium text-gray-700">판정 사유: </span>
            {primaryReason}
            {(p.eligibility?.failed.length ?? 0) > 1 && ` (외 ${p.eligibility!.failed.length - 1}건)`}
          </p>
        </div>
      )}
    </Link>
  )
}
