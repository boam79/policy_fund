import { Suspense } from 'react'
import OAuthReturnHandler from '@/components/auth/OAuthReturnHandler'

export default function OAuthReturnHandlerBoundary() {
  return (
    <Suspense fallback={null}>
      <OAuthReturnHandler />
    </Suspense>
  )
}
