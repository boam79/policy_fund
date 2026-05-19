'use client'

import { useState } from 'react'
import { Loader2, Save } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { PROVINCE_OPTIONS } from '@/lib/geo/regions'
import { INDUSTRY_FILTER_OPTIONS } from '@/lib/industry/options'
import type { SavedBusinessProfileDefaults } from '@/lib/profile/business-profile-defaults'
import { upsertBusinessProfile } from '@/lib/profile/saveBusinessProfile'

type Props = {
  initialProfile: SavedBusinessProfileDefaults | null
  userId: string
  profileId?: string | null
  onSaved?: () => void
}

export default function MemberProfileInlineForm({
  initialProfile,
  userId,
  profileId: initialProfileId,
  onSaved,
}: Props) {
  const supabase = createClient()
  const [profileId, setProfileId] = useState(initialProfileId ?? null)
  const [region, setRegion] = useState(initialProfile?.region ?? '')
  const [industry, setIndustry] = useState(initialProfile?.industry ?? '')
  const [businessAge, setBusinessAge] = useState(
    initialProfile?.business_age_years != null ? String(initialProfile.business_age_years) : ''
  )
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const handleSave = async () => {
    setSaving(true)
    setMessage('')
    const result = await upsertBusinessProfile(
      supabase,
      userId,
      {
        region: region || null,
        industry: industry || null,
        business_age_years: businessAge ? Number(businessAge) : null,
        city: initialProfile?.city ?? null,
        company_name: initialProfile?.company_name ?? null,
        support_purpose: initialProfile?.support_purpose ?? null,
      },
      profileId
    )
    setSaving(false)
    if (!result.ok) {
      setMessage(result.message)
      return
    }
    setProfileId(result.id)
    setMessage('저장되었습니다. 추천 공고가 갱신됩니다.')
    onSaved?.()
  }

  return (
    <div className="mt-4 space-y-3 rounded-xl border border-blue-100 bg-blue-50/40 p-4">
      <p className="text-xs font-medium text-blue-900">맞춤 추천을 위해 프로필을 입력해 주세요</p>
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="block text-xs">
          <span className="mb-1 block text-muted-foreground">지역</span>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="w-full rounded-lg border bg-white px-2 py-2 text-sm"
          >
            <option value="">선택</option>
            {PROVINCE_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs">
          <span className="mb-1 block text-muted-foreground">업종</span>
          <select
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="w-full rounded-lg border bg-white px-2 py-2 text-sm"
          >
            <option value="">선택</option>
            {INDUSTRY_FILTER_OPTIONS.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs">
          <span className="mb-1 block text-muted-foreground">업력(년)</span>
          <input
            type="number"
            min={0}
            max={100}
            value={businessAge}
            onChange={(e) => setBusinessAge(e.target.value)}
            className="w-full rounded-lg border bg-white px-2 py-2 text-sm"
            placeholder="예: 3"
          />
        </label>
      </div>
      <button
        type="button"
        onClick={() => void handleSave()}
        disabled={saving || !region || !industry}
        className={cn(buttonVariants({ size: 'sm' }), 'w-full sm:w-auto')}
      >
        {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
        프로필 저장하고 추천 받기
      </button>
      {message && <p className="text-xs text-blue-800">{message}</p>}
    </div>
  )
}
