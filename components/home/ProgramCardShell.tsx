import { Badge } from '@/components/ui/badge'
import { getProgramSourceLabel } from '@/lib/gov-support/programSources'
import { cn } from '@/lib/utils'

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  active: { label: '모집중', className: 'bg-green-100 text-green-700 border-green-200' },
  closing_soon: { label: '마감임박', className: 'bg-red-100 text-red-700 border-red-200 animate-pulse' },
}

type Props = {
  source?: string | null
  status?: string | null
  className?: string
  statusVariant?: 'default' | 'emerald'
}

export function ProgramSourceBadge({ source, className }: { source?: string | null; className?: string }) {
  if (!source) return null
  return (
    <Badge variant="outline" className={cn('text-xs font-normal', className)}>
      {getProgramSourceLabel(source)}
    </Badge>
  )
}

export function ProgramStatusBadge({
  status,
  variant = 'default',
}: {
  status?: string | null
  variant?: 'default' | 'emerald'
}) {
  const key = status ?? 'active'
  const badge =
    variant === 'emerald'
      ? ({
          active: { label: '모집중', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
          closing_soon: { label: '마감임박', className: 'bg-red-50 text-red-700 border-red-200' },
        }[key] ?? STATUS_BADGE.active)
      : (STATUS_BADGE[key] ?? STATUS_BADGE.active)

  return (
    <Badge variant="outline" className={cn('text-xs font-medium', badge.className)}>
      {badge.label}
    </Badge>
  )
}

export function ProgramCardShell({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <article
      className={cn(
        'flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-white shadow-sm transition-shadow hover:shadow-md',
        className
      )}
    >
      {children}
    </article>
  )
}
