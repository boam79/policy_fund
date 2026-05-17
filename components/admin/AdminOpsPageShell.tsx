import { Suspense, type ReactNode } from 'react'
import { AdminOpsTabs } from '@/components/admin/AdminOpsTabs'

/** 운영 페이지 공통: 상단 탭 */
export function AdminOpsPageShell({ children }: { children: ReactNode }) {
  return (
    <div className="p-6">
      <Suspense fallback={null}>
        <AdminOpsTabs />
      </Suspense>
      {children}
    </div>
  )
}
