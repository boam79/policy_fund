import { redirect } from 'next/navigation'

/** 레거시 URL — 후원 페이지로 이동 */
export default function PricingRedirectPage() {
  redirect('/support')
}
