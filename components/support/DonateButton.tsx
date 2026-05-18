import Link from 'next/link'
import { Heart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getDonateUrl } from '@/lib/site-config'
import { donateCtaBaseClass, donateCtaSizeClass } from '@/components/support/donate-button-styles'

type DonateButtonProps = {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'primary' | 'outline'
  showIcon?: boolean
}

/** 후원 안내 페이지(`/support`, QR 표시)로 이동 */
export function DonateButton({
  className,
  size = 'md',
  variant = 'primary',
  showIcon = true,
}: DonateButtonProps) {
  const httpsUrl = getDonateUrl()
  const classNames = cn(
    donateCtaBaseClass,
    donateCtaSizeClass[size],
    variant === 'primary'
      ? 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm'
      : 'border border-rose-200 bg-white text-rose-700 hover:bg-rose-50',
    className
  )

  if (httpsUrl) {
    return (
      <a
        href={httpsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={classNames}
        aria-label="후원하기, 새 창에서 외부 후원 페이지 열기"
      >
        {showIcon && <Heart className="h-4 w-4 shrink-0 fill-current" aria-hidden />}
        <span>후원하기</span>
        <span className="sr-only">(새 창)</span>
      </a>
    )
  }

  return (
    <Link
      href="/support"
      className={classNames}
      aria-label="후원하기, 토스 QR 코드 안내 페이지로 이동"
    >
      {showIcon && <Heart className="h-4 w-4 shrink-0 fill-current" aria-hidden />}
      <span>후원하기</span>
    </Link>
  )
}
