import { cn } from '@/lib/utils'

/** 후원 CTA 공통 — 키보드 포커스·최소 터치 영역(44px) */
export const donateCtaBaseClass = cn(
  'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-colors',
  'min-h-11 px-4',
  'focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-offset-2'
)

export const donateCtaSizeClass = {
  sm: 'min-h-11 px-3.5 py-2 text-sm',
  md: 'min-h-11 px-4 py-2.5 text-sm',
  lg: 'min-h-12 px-6 py-3 text-base',
} as const
