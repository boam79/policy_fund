import { Smartphone } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getDonateDeepLink } from '@/lib/site-config'

type OpenInTossButtonProps = {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeClass = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
}

/** `/support` 전용 — 토스 앱 송금 딥링크 (모바일) */
export function OpenInTossButton({ className, size = 'lg' }: OpenInTossButtonProps) {
  return (
    <a
      href={getDonateDeepLink()}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-colors',
        'border border-rose-200 bg-white text-rose-700 hover:bg-rose-50',
        sizeClass[size],
        className
      )}
    >
      <Smartphone className="h-4 w-4" />
      토스 앱에서 열기
    </a>
  )
}
