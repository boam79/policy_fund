/** AI 매칭 점수 원형 링 (목업 카드 하단) */
export default function MatchScoreRing({ score, size = 44 }: { score: number; size?: number }) {
  const r = (size - 6) / 2
  const c = 2 * Math.PI * r
  const offset = c - (score / 100) * c

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} aria-hidden>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E5E7EB" strokeWidth="4" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#3B82F6"
          strokeWidth="4"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center font-bold text-blue-600"
        style={{ fontSize: size <= 36 ? 9 : 11 }}
      >
        {score}%
      </span>
    </div>
  )
}
