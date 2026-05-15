'use client'
import { useState } from 'react'
import { ThumbsUp, ThumbsDown } from 'lucide-react'

interface Props {
  targetType: string
  targetId?: string
  label?: string
}

export default function FeedbackWidget({ targetType, targetId, label = '이 결과가 도움이 되었나요?' }: Props) {
  const [voted, setVoted] = useState<1 | 0 | null>(null)
  const [sending, setSending] = useState(false)

  const vote = async (rating: 1 | 0) => {
    if (voted !== null) return
    setSending(true)
    await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_type: targetType, target_id: targetId, rating }),
    })
    setVoted(rating)
    setSending(false)
  }

  return (
    <div className="flex items-center gap-3 text-sm text-gray-500">
      <span>{label}</span>
      {voted === null ? (
        <>
          <button onClick={() => vote(1)} disabled={sending}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border hover:bg-green-50 hover:border-green-300 hover:text-green-600 transition-colors disabled:opacity-50">
            <ThumbsUp className="h-3.5 w-3.5" />도움됨
          </button>
          <button onClick={() => vote(0)} disabled={sending}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border hover:bg-red-50 hover:border-red-300 hover:text-red-500 transition-colors disabled:opacity-50">
            <ThumbsDown className="h-3.5 w-3.5" />아쉬워요
          </button>
        </>
      ) : (
        <span className="text-xs text-green-600 font-medium">
          {voted === 1 ? '👍 피드백 감사합니다!' : '🙏 개선하겠습니다!'}
        </span>
      )}
    </div>
  )
}
