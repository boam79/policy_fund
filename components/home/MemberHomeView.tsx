import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import SearchBar from '@/components/home/SearchBar'
import MatchSpotlightCard from '@/components/home/MatchSpotlightCard'
import RecentSearchChips from '@/components/home/RecentSearchChips'
import { stripHtmlToText } from '@/lib/utils/stripHtml'
import type { MemberHomeData } from '@/lib/home/member-feed'
import { Clock, User, Sparkles, BookOpen } from 'lucide-react'

function profileLine(profile: MemberHomeData['profile']): string {
  if (!profile) return ''
  const parts: string[] = []
  if (profile.region?.trim()) parts.push(profile.region.trim())
  if (profile.industry?.trim()) parts.push(profile.industry.trim())
  if (profile.business_age_years != null) parts.push(`업력 ${profile.business_age_years}년`)
  return parts.join(' · ')
}

export default function MemberHomeView({
  displayName,
  memberData,
}: {
  displayName: string
  memberData: MemberHomeData
}) {
  const { profile, profileSearchUrl, personalizedFromProfile, closingSoon, spotlightPrograms } =
    memberData
  const profileSummary = profileLine(profile)

  return (
    <div className="flex flex-col bg-gray-50">
      <section className="border-b bg-white px-4 py-8">
        <div className="container mx-auto max-w-7xl">
          <p className="mb-1 text-sm text-muted-foreground">내 지원 홈</p>
          <h1 className="mb-4 text-2xl font-black text-gray-900 md:text-3xl">
            안녕하세요, {displayName}님
          </h1>
          <div className="mb-6 max-w-2xl">
            <SearchBar size="default" useSavedProfileDefaults />
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/diagnosis" className={cn(buttonVariants({ size: 'lg' }))}>
              3분 맞춤 진단 {profile ? '다시하기' : '시작하기'}
            </Link>
            <Link
              href={profileSearchUrl ?? '/search'}
              className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}
            >
              조건으로 검색
            </Link>
          </div>
        </div>
      </section>

      <section className="px-4 py-8">
        <div className="container mx-auto max-w-7xl">
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="space-y-6 lg:col-span-4">
              <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <h2 className="mb-3 flex items-center gap-2 text-base font-bold">
                  <User className="h-4 w-4 text-blue-600" />
                  내 프로필
                </h2>
                {profile ? (
                  <>
                    <p className="text-sm text-gray-700">{profileSummary || '프로필 정보를 확인하세요.'}</p>
                    {profile.company_name && (
                      <p className="mt-1 text-xs text-muted-foreground">{profile.company_name}</p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    마이페이지에서 기업 정보를 저장하면 맞춤 추천이 정확해집니다.
                  </p>
                )}
                <Link
                  href="/mypage"
                  className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'mt-4 w-full')}
                >
                  프로필 상세 보기
                </Link>
              </div>

              <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <h2 className="mb-3 flex items-center gap-2 text-base font-bold">
                  <Clock className="h-4 w-4 text-red-500" />
                  마감 임박 {closingSoon.length > 0 ? `${closingSoon.length}건` : ''}
                </h2>
                {closingSoon.length === 0 ? (
                  <p className="text-sm text-muted-foreground">7일 이내 마감 공고가 없습니다.</p>
                ) : (
                  <ul className="space-y-2">
                    {closingSoon.map((p) => (
                      <li key={p.id}>
                        <Link
                          href={`/search/${p.id}`}
                          className="flex items-center justify-between gap-2 rounded-lg border p-3 hover:border-red-200 hover:bg-red-50/50 transition-colors"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-gray-900">
                              {stripHtmlToText(p.title)}
                            </span>
                          </span>
                          {p.daysLeft !== null && (
                            <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                              D-{p.daysLeft}
                            </span>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <h2 className="mb-3 flex items-center gap-2 text-base font-bold">
                  <Sparkles className="h-4 w-4 text-blue-500" />
                  최근 검색
                </h2>
                <RecentSearchChips />
              </div>
            </div>

            <div className="lg:col-span-8">
              <div className="mb-4 flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold">추천 공고</h2>
                  <p className="text-sm text-muted-foreground">
                    {personalizedFromProfile
                      ? '저장된 프로필 조건으로 찾은 공고입니다.'
                      : '프로필을 저장하거나 진단을 완료하면 맞춤 추천이 표시됩니다.'}
                  </p>
                </div>
                <Link href={profileSearchUrl ?? '/search'} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
                  더 보기 →
                </Link>
              </div>

              {spotlightPrograms.length === 0 ? (
                <div className="rounded-2xl border border-dashed bg-white p-10 text-center text-sm text-muted-foreground">
                  조건에 맞는 공고가 없습니다. 진단을 다시 하거나 검색 조건을 넓혀 보세요.
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {spotlightPrograms.map((prog) => (
                    <MatchSpotlightCard key={prog.id} program={prog} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t bg-blue-50 px-4 py-8">
        <div className="container mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-start gap-3">
            <BookOpen className="mt-0.5 h-6 w-6 text-blue-600" />
            <div>
              <h3 className="font-bold text-gray-900">지원둥지 활용 가이드</h3>
              <p className="text-sm text-muted-foreground">검색 · 진단 · 서류 생성까지 단계별 안내</p>
            </div>
          </div>
          <Link href="/guide" className={cn(buttonVariants({ variant: 'outline' }))}>
            가이드 보기
          </Link>
        </div>
      </section>
    </div>
  )
}
