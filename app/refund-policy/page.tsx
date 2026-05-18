import { redirect } from 'next/navigation'

/** 레거시 URL — 이용약관으로 이동 */
export default function RefundPolicyRedirectPage() {
  redirect('/terms')
}
