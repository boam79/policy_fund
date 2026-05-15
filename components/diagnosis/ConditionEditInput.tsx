'use client'

import { useRef } from 'react'

type Props = {
  value: string
  onChange: (value: string) => void
  onSave: () => void
  onCancel?: () => void
  placeholder?: string
  className?: string
}

/** 한글 IME 조합 중 Enter·상태 동기화 문제를 줄이기 위한 조건 입력 필드 */
export default function ConditionEditInput({
  value,
  onChange,
  onSave,
  onCancel,
  placeholder,
  className,
}: Props) {
  const composingRef = useRef(false)

  return (
    <input
      autoFocus
      type="text"
      lang="ko"
      inputMode="text"
      autoComplete="off"
      value={value}
      placeholder={placeholder}
      className={className}
      onCompositionStart={() => {
        composingRef.current = true
      }}
      onCompositionEnd={(e) => {
        composingRef.current = false
        onChange(e.currentTarget.value)
      }}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.nativeEvent.isComposing || composingRef.current) return
        if (e.key === 'Enter') {
          e.preventDefault()
          onSave()
        }
        if (e.key === 'Escape') {
          e.preventDefault()
          onCancel?.()
        }
      }}
    />
  )
}
