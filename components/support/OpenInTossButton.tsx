import { Smartphone } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getDonateDeepLink } from '@/lib/site-config'
import { donateCtaBaseClass, donateCtaSizeClass } from '@/components/support/donate-button-styles'

type OpenInTossButtonProps = {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  /** 안내 문구 요소 id (`aria-describedby`) */
  describedBy?: string
}

/** `/support` 전용 — 토스 앱 송금 딥링크 (모바일) */
export function OpenInTossButton({
  className,
  size = 'lg',
  describedBy,
}: OpenInTossButtonProps) {
  return (
    <a
      href={getDonateDeepLink()}
      className={cn(
        donateCtaBaseClass,
        donateCtaSizeClass[size],
        'border border-rose-200 bg-white text-rose-700 hover:bg-rose-50',
        className
      )}
      aria-label="토스 앱에서 후원 송금 화면 열기"
      {...(describedBy ? { 'aria-describedby': describedBy } : {})}
    >
      <Smartphone className="h-4 w-4 shrink-0" aria-hidden />
      <span>토스 앱에서 열기</span>
    </a>
  )
}
