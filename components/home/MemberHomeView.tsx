'use client'

import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import SearchBar from '@/components/home/SearchBar'
import RecentSearchChips from '@/components/home/RecentSearchChips'
import MemberProfileCard from '@/components/home/MemberProfileCard'
import MemberProfileInlineForm from '@/components/home/MemberProfileInlineForm'
import MemberSpotlightSection, { refreshMemberSpotlight } from '@/components/home/MemberSpotlightSection'
import DiagnosisStepPreview from '@/components/home/DiagnosisStepPreview'
import { stripHtmlToText } from '@/lib/utils/stripHtml'
import type { MemberHomeData } from '@/lib/home/member-feed'
import { isProfileCompleteForRecommendations } from '@/lib/home/recommendReason'
import { SEARCH_LIST_HREF } from '@/lib/search/browse'
import { Clock, Sparkles, BookOpen } from 'lucide-react'

function profileSubtitle(profile: MemberHomeData['profile']): string | null {
  if (!profile) return null
  const parts: string[] = []
  const region = [profile.region, profile.city].filter(Boolean).join(' ')
  if (region) parts.push(region)
  if (profile.industry?.trim()) parts.push(profile.industry.trim())
  if (profile.business_age_years != null) parts.push(`업력 ${profile.business_age_years}년`)
  return parts.length > 0 ? parts.join(' · ') : null
}

export default function MemberHomeView({
  displayName,
  userId,
  memberData,
}: {
  displayName: string
  userId: string
  memberData: MemberHomeData
}) {
  const { profile, profileSearchUrl, personalizedFromProfile, closingSoon, spotlightPrograms } =
    memberData
  const subtitle = profileSubtitle(profile)
  const profileComplete = isProfileCompleteForRecommendations(profile)

  return (
    <div className="flex flex-col bg-gray-50">
      <section className="border-b bg-gradient-to-b from-blue-50/80 to-white px-4 py-8 md:py-10">
        <div className="container mx-auto max-w-7xl">
          <p className="mb-1 text-sm font-medium text-blue-700">내 지원 홈</p>
          <h1 className="mb-1 text-2xl font-black text-gray-900 md:text-3xl">
            안녕하세요, {displayName}님
          </h1>
          {subtitle && (
            <p className="mb-5 text-sm text-muted-foreground md:text-base">{subtitle}</p>
          )}
          {!subtitle && <div className="mb-5" />}

          <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
            <div className="lg:col-span-7">
              <div className="mb-5 max-w-2xl">
                <SearchBar size="large" useSavedProfileDefaults />
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/diagnosis" className={cn(buttonVariants({ size: 'lg' }))}>
                  3분 맞춤 진단 {profile ? '다시하기' : '시작하기'}
                </Link>
                <Link
                  href={profileSearchUrl ?? SEARCH_LIST_HREF}
                  className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}
                >
                  조건으로 검색
                </Link>
              </div>
            </div>
            <div className="lg:col-span-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                3분 진단 미리보기
              </p>
              <DiagnosisStepPreview />
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-8 pb-24 md:pb-8">
        <div className="container mx-auto max-w-7xl">
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="space-y-6 lg:col-span-4">
              <MemberProfileCard profile={profile} />
              {!profileComplete && (
                <MemberProfileInlineForm
                  initialProfile={profile}
                  userId={userId}
                  onSaved={() => refreshMemberSpotlight()}
                />
              )}

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
                          className="flex items-center justify-between gap-2 rounded-lg border p-3 transition-colors hover:border-red-200 hover:bg-red-50/50"
                        >
                          <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900">
                            {stripHtmlToText(p.title)}
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
                <p className="mb-2 text-xs text-muted-foreground">탭하면 추천 공고가 갱신됩니다.</p>
                <RecentSearchChips mode="home" />
              </div>

              <Link
                href="/mypage/alerts"
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'sm' }),
                  'w-full justify-center'
                )}
              >
                마감·신규 알림 설정
              </Link>
            </div>

            <div className="lg:col-span-8">
              <MemberSpotlightSection
                initialPrograms={spotlightPrograms}
                initialPersonalized={personalizedFromProfile}
                profile={profile}
                profileSearchUrl={profileSearchUrl}
              />
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
