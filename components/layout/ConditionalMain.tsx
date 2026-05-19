'use client'

import { usePathname } from 'next/navigation'

export default function ConditionalMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? ''
  const isAdmin = pathname.startsWith('/admin')

  if (isAdmin) {
    return <>{children}</>
  }

  return <main className="min-h-[calc(100vh-4rem)] pb-16 md:pb-0">{children}</main>
}
