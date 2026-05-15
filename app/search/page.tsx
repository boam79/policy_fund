'use client'

import { useState, useCallback } from 'react'
import { Search, Filter, Building2, MapPin, Calendar, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react'
import FeedbackWidget from '@/components/FeedbackWidget'
import { eligibilityLabel, eligibilityColor, type EligibilityStatus } from '@/lib/gov-support/tools/eligibility'
import type { SupportProgram } from '@/lib/gov-support/tools/unifiedSearch'

interface EligibilityResult {
  status: EligibilityStatus
  score: number
  passed: string[]
  failed: string[]
  unknown: string[]
}

interface ProgramWithEligibility extends SupportProgram {
  eligibility: EligibilityResult
  days_left: number | null
}

const INDUSTRIES = ['제조업', '서비스업', 'IT/소프트웨어', '유통/도소매', '음식/외식', '건설업', '기타']
const REGIONS = ['전국', '서울', '경기', '인천', '부산', '대구', '광주', '대전', '울산', '세종', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주']

const LEGAL_DISCLAIMER = '본 자격판정 결과는 AI 기반 참고 정보이며 법적 효력이 없습니다. 실제 신청 가능 여부는 해당 지원기관의 공식 공고문을 반드시 확인하세요.'

export default function SearchPage() {
  const [region, setRegion] = useState('')
  const [industry, setIndustry] = useState('')
  const [keyword, setKeyword] = useState('')
  const [businessAge, setBusinessAge] = useState('')
  const [employeeCount, setEmployeeCount] = useState('')
  const [taxArrears, setTaxArrears] = useState<'yes' | 'no' | ''>('')
  const [showFilters, setShowFilters] = useState(false)

  const [programs, setPrograms] = useState<ProgramWithEligibility[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const LIMIT = 20

  const handleSearch = useCallback(async (p = 1) => {
    setLoading(true)
    setSearched(true)
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          region: region || undefined,
          industry: industry || undefined,
          keyword: keyword || undefined,
          business_age_years: businessAge ? Number(businessAge) : undefined,
          employee_count: employeeCount ? Number(employeeCount) : undefined,
          tax_arrears: taxArrears === 'yes' ? true : taxArrears === 'no' ? false : undefined,
          page: p,
          limit: LIMIT,
        }),
      })
      const data = await res.json()
      setPrograms(data.programs ?? [])
      setTotal(data.total ?? 0)
      setPage(p)
    } catch {
      setPrograms([])
    } finally {
      setLoading(false)
    }
  }, [region, industry, keyword, businessAge, employeeCount, taxArrears])

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 검색 헤더 */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto max-w-5xl px-4 py-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="공고명, 기관명, 지원내용 검색..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch(1)}
                className="w-full pl-9 pr-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-1.5 px-4 py-2.5 border rounded-lg text-sm hover:bg-gray-50 transition-colors"
            >
              <Filter className="h-4 w-4" />
              필터
            </button>
            <button
              onClick={() => handleSearch(1)}
              disabled={loading}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              검색
            </button>
          </div>

          {/* 필터 패널 */}
          {showFilters && (
            <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-3 pt-3 border-t">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">지역</label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">전체 지역</option>
                  {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">업종</label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">전체 업종</option>
                  {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">업력 (년)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="예: 3"
                  value={businessAge}
                  onChange={(e) => setBusinessAge(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">직원 수</label>
                <input
                  type="number"
                  min="0"
                  placeholder="예: 10"
                  value={employeeCount}
                  onChange={(e) => setEmployeeCount(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">세금 체납 여부</label>
                <select
                  value={taxArrears}
                  onChange={(e) => setTaxArrears(e.target.value as 'yes' | 'no' | '')}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">선택 안함</option>
                  <option value="no">없음</option>
                  <option value="yes">있음</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="container mx-auto max-w-5xl px-4 py-6">
        {/* 결과 요약 */}
        {searched && !loading && (
          <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm text-gray-600">
              총 <span className="font-semibold text-gray-900">{total.toLocaleString()}건</span> 검색됨
            </p>
            <div className="flex items-center gap-4">
              <p className="text-xs text-gray-400">{page}/{totalPages || 1} 페이지</p>
              <FeedbackWidget targetType="search" label="검색 결과가 유용했나요?" />
            </div>
          </div>
        )}

        {/* 로딩 */}
        {loading && (
          <div className="space-y-3">
            {[1,2,3,4,5].map((i) => (
              <div key={i} className="bg-white rounded-xl border p-5 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/3" />
              </div>
            ))}
          </div>
        )}

        {/* 결과 없음 */}
        {searched && !loading && programs.length === 0 && (
          <div className="bg-white rounded-xl border p-12 text-center">
            <Search className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">검색 결과가 없습니다.</p>
            <p className="text-sm text-gray-400 mt-1">조건을 변경하거나 키워드를 수정해보세요.</p>
          </div>
        )}

        {/* 초기 화면 */}
        {!searched && !loading && (
          <div className="bg-white rounded-xl border p-12 text-center">
            <Search className="h-10 w-10 text-blue-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">지원사업을 검색해보세요</p>
            <p className="text-sm text-gray-400 mt-1">키워드, 지역, 업종 등으로 검색하면 자격판정 결과도 함께 표시됩니다.</p>
          </div>
        )}

        {/* 공고 카드 목록 */}
        {!loading && programs.length > 0 && (
          <div className="space-y-3">
            {programs.map((p) => (
              <ProgramCard key={p.id} program={p} />
            ))}
          </div>
        )}

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-8">
            <button
              onClick={() => handleSearch(page - 1)}
              disabled={page <= 1 || loading}
              className="p-2 rounded-lg border hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = Math.max(1, page - 2) + i
              if (pageNum > totalPages) return null
              return (
                <button
                  key={pageNum}
                  onClick={() => handleSearch(pageNum)}
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                    pageNum === page
                      ? 'bg-blue-600 text-white'
                      : 'border hover:bg-gray-50 text-gray-600'
                  }`}
                >
                  {pageNum}
                </button>
              )
            })}
            <button
              onClick={() => handleSearch(page + 1)}
              disabled={page >= totalPages || loading}
              className="p-2 rounded-lg border hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* 법적 고지 */}
        {searched && (
          <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs text-yellow-800 leading-relaxed">
              ⚠️ {LEGAL_DISCLAIMER}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function ProgramCard({ program: p }: { program: ProgramWithEligibility }) {
  const status = p.eligibility?.status ?? 'unknown'
  const colorClass = eligibilityColor(status)
  const label = eligibilityLabel(status)

  const isClosingSoon = p.days_left !== null && p.days_left !== undefined && p.days_left <= 7 && p.days_left >= 0
  const isClosed = p.days_left !== null && p.days_left !== undefined && p.days_left < 0

  return (
    <a
      href={`/search/${p.id}`}
      className="block bg-white rounded-xl border hover:border-blue-300 hover:shadow-md transition-all p-5 group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            {/* 자격판정 배지 */}
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
              {label}
            </span>
            {/* 마감 배지 */}
            {isClosed && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                마감
              </span>
            )}
            {isClosingSoon && !isClosed && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                D-{p.days_left}
              </span>
            )}
            {p.source && (
              <span className="text-xs text-gray-400">
                {p.source === 'bizinfo' ? '기업마당' : p.source === 'kstartup' ? 'K-Startup' : '중소벤처24'}
              </span>
            )}
          </div>
          <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
            {p.title}
          </h3>
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
            {p.organization && (
              <span className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {p.organization}
              </span>
            )}
            {p.region && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {p.region}
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
            <p className="mt-1.5 text-xs text-gray-500 line-clamp-1">{p.support_type}</p>
          )}
        </div>
        <ExternalLink className="h-4 w-4 text-gray-300 group-hover:text-blue-400 flex-shrink-0 mt-1 transition-colors" />
      </div>

      {/* 자격판정 세부 (실패 조건이 있을 때만) */}
      {p.eligibility?.failed?.length > 0 && (
        <div className="mt-3 pt-3 border-t border-dashed">
          <p className="text-xs text-gray-500">
            ⚠️ {p.eligibility.failed[0]}
            {p.eligibility.failed.length > 1 && ` 외 ${p.eligibility.failed.length - 1}건`}
          </p>
        </div>
      )}
    </a>
  )
}
