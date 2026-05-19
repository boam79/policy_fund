/**
 * 사용자 통합 검색(/search) 결과 풀 — 지역·키워드 필터 **이전**까지의 조건만.
 * “DB 전체 행”과는 다름.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

/** 모집 가능으로 목록에 포함하는 status (unifiedSearch 기본) — unknown 은 마감일 미기재·「예산 소진시」 등 */
export const PROGRAM_SEARCH_POOL_STATUSES = ['active', 'closing_soon', 'unknown'] as const

/** 「마감 포함」 필터 시 추가 */
export const PROGRAM_SEARCH_CLOSED_STATUS = 'closed' as const

export function searchPoolStatuses(includeClosed?: boolean): string[] {
  if (includeClosed) {
    return [...PROGRAM_SEARCH_POOL_STATUSES, PROGRAM_SEARCH_CLOSED_STATUS]
  }
  return [...PROGRAM_SEARCH_POOL_STATUSES]
}

export function todayISODate(): string {
  return new Date().toISOString().slice(0, 10)
}

/** 마감일: 오늘 이후이거나 미기재만 (unifiedSearch 와 동일) */
export function programSearchPoolEndDateOr(today: string): string {
  return `application_end_date.gte.${today},application_end_date.is.null`
}

/**
 * 신청 접수 **시작 전**인 공고는 검색 풀에서 제외 (더 엄격한 “지금 신청 가능” 근사치)
 */
export function programSearchPoolStartDateOr(today: string): string {
  return `application_start_date.is.null,application_start_date.lte.${today}`
}

/** unifiedSearch 기본 풀 카운트 전용 쿼리 (head) */
export async function countProgramSearchPool(
  supabase: SupabaseClient<Database>,
  today: string = todayISODate()
): Promise<number> {
  const { count, error } = await supabase
    .from('support_programs')
    .select('*', { count: 'exact', head: true })
    .in('status', [...PROGRAM_SEARCH_POOL_STATUSES])
    .eq('visibility_status', 'visible')
    .or(programSearchPoolEndDateOr(today))

  if (error) throw new Error(error.message)
  return count ?? 0
}

/** 기본 풀 + 접수 시작일이 이미 도래한 행만 */
export async function countProgramSearchPoolAcceptedOpen(
  supabase: SupabaseClient<Database>,
  today: string = todayISODate()
): Promise<number> {
  const { count, error } = await supabase
    .from('support_programs')
    .select('*', { count: 'exact', head: true })
    .in('status', [...PROGRAM_SEARCH_POOL_STATUSES])
    .eq('visibility_status', 'visible')
    .or(programSearchPoolEndDateOr(today))
    .or(programSearchPoolStartDateOr(today))

  if (error) throw new Error(error.message)
  return count ?? 0
}
