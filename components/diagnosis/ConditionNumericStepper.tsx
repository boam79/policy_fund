'use client'

import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  value: number
  onChange: (next: number) => void
  min?: number
  max?: number
  step?: number
  unit?: string
  className?: string
}

export default function ConditionNumericStepper({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  unit,
  className,
}: Props) {
  const safe = Number.isFinite(value) ? value : min

  function bump(delta: number) {
    const next = Math.min(max, Math.max(min, Math.round((safe + delta) * 10) / 10))
    onChange(next)
  }

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <button
        type="button"
        aria-label="값 줄이기"
        onClick={() => bump(-step)}
        disabled={safe <= min}
        className="flex h-7 w-7 items-center justify-center rounded border bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={safe}
        onChange={(e) => {
          const n = Number(e.target.value)
          if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n)))
        }}
        className="h-7 w-14 rounded border px-1 text-center text-sm outline-none focus:border-primary"
      />
      {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
      <button
        type="button"
        aria-label="값 늘리기"
        onClick={() => bump(step)}
        disabled={safe >= max}
        className="flex h-7 w-7 items-center justify-center rounded border bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
