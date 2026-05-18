import { redirect } from 'next/navigation'

/** /admin → 대시보드 */
export default function AdminIndexPage() {
  redirect('/admin/dashboard')
}
