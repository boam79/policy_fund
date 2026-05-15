export default function Page() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-16">
      <div className="rounded-xl border bg-muted/30 p-12 text-center">
          <a href="/search" className="text-sm text-blue-600 hover:underline">← 이전으로</a>
        <h1 className="mb-3 text-3xl font-bold">공고 상세</h1>
        <p className="text-muted-foreground">공고 상세 정보와 자격판정 결과입니다.</p>
        <p className="mt-4 text-sm text-orange-500">🚧 개발 예정 (Phase 구현 중)</p>
      </div>
    </div>
  )
}
