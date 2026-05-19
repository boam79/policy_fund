'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import HomeProgramRichCard from '@/components/home/HomeProgramRichCard'
import type { RecommendedProgram } from '@/lib/home/recommendations'
import { isProfileCompleteForRecommendations } from '@/lib/home/recommendReason'
import type { SavedBusinessProfileDefaults } from '@/lib/profile/business-profile-defaults'
import { SEARCH_LIST_HREF } from '@/lib/search/browse'
import { Loader2 } from 'lucide-react'

type Props = {
  initialPrograms: RecommendedProgram[]
  initialPersonalized: boolean
  profile: SavedBusinessProfileDefaults | null
  profileSearchUrl: string | null
}

export default function MemberSpotlightSection({
  initialPrograms,
  initialPersonalized,
  profile,
  profileSearchUrl,
}: Props) {
  const [programs, setPrograms] = useState(initialPrograms)
  const [personalizedFromProfile, setPersonalizedFromProfile] = useState(initialPersonalized)
  const [loading, setLoading] = useState(false)
  const [keywordHint, setKeywordHint] = useState<string | null>(null)

  const refresh = useCallback(async (keyword?: string) => {
    setLoading(true)
    try {
      const qs = keyword ? `?keyword=${encodeURIComponent(keyword)}` : ''
      const res = await fetch(`/api/home/spotlight${qs}`)
      const data = (await res.json()) as {
        ok?: boolean
        programs?: RecommendedProgram[]
        personalizedFromProfile?: boolean
        keyword?: string | null
      }
      if (res.ok && data.programs) {
        setPrograms(data.programs)
        setPersonalizedFromProfile(Boolean(data.personalizedFromProfile))
        setKeywordHint(data.keyword ?? null)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const profileComplete = isProfileCompleteForRecommendations(profile)

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold">
            {keywordHint
              ? `「${keywordHint.length > 20 ? `${keywordHint.slice(0, 20)}…` : keywordHint}」 검색 추천`
              : personalizedFromProfile
                ? '진단·프로필 기반 추천'
                : '추천 공고'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {keywordHint
              ? '최근 검색어 기준으로 찾은 공고입니다.'
              : personalizedFromProfile
                ? '저장된 프로필 조건으로 찾은 공고입니다.'
                : profileComplete
                  ? '프로필 조건으로 추천 중입니다.'
                  : '프로필을 저장하거나 진단을 완료하면 맞춤 추천이 표시됩니다.'}
          </p>
        </div>
        <Link
          href={profileSearchUrl ?? SEARCH_LIST_HREF}
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
        >
          더 보기 →
        </Link>
      </div>

      {loading && (
        <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          추천 공고 불러오는 중…
        </div>
      )}

      {programs.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-white p-10 text-center text-sm text-muted-foreground">
          조건에 맞는 공고가 없습니다. 진단을 다시 하거나 검색 조건을 넓혀 보세요.
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {programs.map((prog, i) => (
            <HomeProgramRichCard
              key={prog.id}
              program={prog}
              variant="member"
              rankIndex={i}
              personalized={personalizedFromProfile && !keywordHint}
            />
          ))}
        </div>
      )}

      {/* refresh exposed for parent via custom event */}
      <SpotlightRefreshBridge onRefresh={refresh} />
    </>
  )
}

function SpotlightRefreshBridge({ onRefresh }: { onRefresh: (keyword?: string) => void }) {
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ keyword?: string }>).detail
      void onRefresh(detail?.keyword)
    }
    window.addEventListener('pf:refresh-spotlight', handler)
    return () => window.removeEventListener('pf:refresh-spotlight', handler)
  }, [onRefresh])
  return null
}

export function refreshMemberSpotlight(keyword?: string) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('pf:refresh-spotlight', { detail: { keyword } }))
}
