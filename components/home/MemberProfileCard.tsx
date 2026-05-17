import Link from 'next/link'
import { MapPin, Briefcase, Calendar, Building2, User } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { SavedBusinessProfileDefaults } from '@/lib/profile/business-profile-defaults'

function ProfileRow({
  icon: Icon,
  label,
  value,
  placeholder,
}: {
  icon: typeof MapPin
  label: string
  value: string | null
  placeholder: string
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={cn('text-sm font-medium', value ? 'text-gray-900' : 'text-muted-foreground')}>
          {value || placeholder}
        </p>
      </div>
    </div>
  )
}

export default function MemberProfileCard({ profile }: { profile: SavedBusinessProfileDefaults | null }) {
  const regionLine = [profile?.region, profile?.city].filter(Boolean).join(' ') || null
  const industry = profile?.industry?.trim() || null
  const years =
    profile?.business_age_years != null ? `업력 ${profile.business_age_years}년` : null

  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <h2 className="mb-4 flex items-center gap-2 text-base font-bold">
        <User className="h-4 w-4 text-blue-600" />
        내 프로필
      </h2>

      {profile?.company_name && (
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          {profile.company_name}
        </p>
      )}

      <div className="space-y-2">
        <ProfileRow icon={MapPin} label="지역" value={regionLine} placeholder="지역을 입력해 주세요" />
        <ProfileRow icon={Briefcase} label="업종" value={industry} placeholder="업종을 입력해 주세요" />
        <ProfileRow icon={Calendar} label="업력" value={years} placeholder="업력을 입력해 주세요" />
      </div>

      <Link href="/mypage" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'mt-4 w-full')}>
        {profile ? '프로필 수정' : '프로필 저장하기'}
      </Link>
    </div>
  )
}
