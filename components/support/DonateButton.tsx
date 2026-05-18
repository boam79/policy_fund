import Link from 'next/link'
import { Heart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getDonateUrl } from '@/lib/site-config'

type DonateButtonProps = {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'primary' | 'outline'
  showIcon?: boolean
}

const sizeClass = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
}

/** 후원 안내 페이지(`/support`, QR 표시)로 이동 */
export function DonateButton({
  className,
  size = 'md',
  variant = 'primary',
  showIcon = true,
}: DonateButtonProps) {
  const httpsUrl = getDonateUrl()
  const base = cn(
    'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-colors',
    sizeClass[size],
    variant === 'primary'
      ? 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm'
      : 'border border-rose-200 bg-white text-rose-700 hover:bg-rose-50',
    className
  )

  if (httpsUrl) {
    return (
      <a href={httpsUrl} target="_blank" rel="noopener noreferrer" className={base}>
        {showIcon && <Heart className="h-4 w-4 fill-current" />}
        후원하기
      </a>
    )
  }

  return (
    <Link href="/support" className={base}>
      {showIcon && <Heart className="h-4 w-4 fill-current" />}
      후원하기
    </Link>
  )
}
