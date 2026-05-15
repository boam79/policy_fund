'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { FaqSection } from '@/lib/content/site-faq'

export default function FaqAccordion({ sections }: { sections: FaqSection[] }) {
  const [open, setOpen] = useState<string | null>(null)
  return (
    <div className="container mx-auto max-w-3xl px-4 py-10">
      {sections.map((cat) => (
        <div key={cat.cat} className="mb-8">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-blue-600">{cat.cat}</h2>
          <div className="space-y-2">
            {cat.items.map((item, i) => {
              const key = `${cat.cat}-${i}`
              return (
                <div key={key} className="overflow-hidden rounded-lg border bg-white">
                  <button
                    type="button"
                    onClick={() => setOpen(open === key ? null : key)}
                    className="flex w-full items-center justify-between px-4 py-4 text-left transition-colors hover:bg-gray-50"
                  >
                    <span className="text-sm font-medium text-gray-900">{item.q}</span>
                    {open === key ? (
                      <ChevronUp className="h-4 w-4 flex-shrink-0 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 flex-shrink-0 text-gray-400" />
                    )}
                  </button>
                  {open === key && (
                    <div className="border-t bg-gray-50 px-4 pb-4">
                      <p className="pt-3 text-sm leading-relaxed text-gray-600">{item.a}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
