export default function Page() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-16">
      <div className="rounded-xl border bg-muted/30 p-12 text-center">
          <a href="/search" className="text-sm text-blue-600 hover:underline">← 이전으로</a>
        <h1 className="mb-3 text-3xl font-bold">빠른 AI 진단 결과</h1>
        <p className="text-muted-foreground">입력 조건 기반 참고용 사전 진단입니다.</p>
        <p className="mt-4 text-sm text-orange-500">🚧 개발 예정 (Phase 구현 중)</p>
      </div>
    </div>
  )
}
