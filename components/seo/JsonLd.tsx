import { safeJsonLdStringify } from '@/lib/seo/safeJsonLd'

/** JSON-LD를 안전하게 주입 (Next App Router) */
export default function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(data) }}
    />
  )
}
