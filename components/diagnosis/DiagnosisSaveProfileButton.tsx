'use client'

import { useState } from 'react'
import { Loader2, Save } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ParseNLResult } from '@/lib/query/parseNaturalLanguage'
import { upsertBusinessProfile } from '@/lib/profile/saveBusinessProfile'

type Props = {
  parsed: ParseNLResult
  editValues: Record<string, string>
}

export function DiagnosisSaveProfileButton({ parsed, editValues }: Props) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      window.location.href = '/login?next=/diagnosis'
      return
    }

    const c = parsed.conditions
    const num = (key: string) => {
      const v = editValues[key] ?? String(c[key as keyof typeof c]?.value ?? '')
      const n = Number(v)
      return Number.isFinite(n) ? n : null
    }

    await upsertBusinessProfile(supabase, user.id, {
      region: editValues.region ?? c.region?.value ?? null,
      city: editValues.city ?? c.city?.value ?? null,
      industry: editValues.industry ?? c.industry?.value ?? null,
      business_age_years: num('business_age_years'),
      employee_count: num('employee_count'),
      support_purpose: editValues.support_purpose ?? c.support_purpose?.value ?? null,
    })

    setSaving(false)
    setDone(true)
  }

  return (
    <button
      type="button"
      onClick={() => void handleSave()}
      disabled={saving || done}
      className={cn(buttonVariants({ variant: 'secondary' }), 'w-full sm:col-span-2')}
    >
      {saving ? (
        <Loader2 className="mr-1 h-4 w-4 animate-spin" />
      ) : (
        <Save className="mr-1 h-4 w-4" />
      )}
      {done ? '프로필에 저장됨' : '이 조건을 내 프로필에 저장'}
    </button>
  )
}
