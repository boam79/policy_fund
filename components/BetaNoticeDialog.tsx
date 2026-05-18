'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Sprout } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { SITE_NAME } from '@/lib/site-config'

const STORAGE_KEY = 'jiwondungji_beta_notice_until'

function isNoticeEnabled(): boolean {
  const raw = process.env.NEXT_PUBLIC_BETA_NOTICE?.trim().toLowerCase()
  return raw !== '0' && raw !== 'false' && raw !== 'off'
}

function shouldShowNotice(): boolean {
  if (!isNoticeEnabled()) return false
  try {
    const until = localStorage.getItem(STORAGE_KEY)
    if (!until) return true
    const ts = Number(until)
    if (!Number.isFinite(ts)) return true
    return Date.now() > ts
  } catch {
    return true
  }
}

function dismissUntil(days: number) {
  try {
    const until = Date.now() + days * 24 * 60 * 60 * 1000
    localStorage.setItem(STORAGE_KEY, String(until))
  } catch {
    /* ignore */
  }
}

export function BetaNoticeDialog() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (shouldShowNotice()) setOpen(true)
  }, [])

  const handleOpenChange = (next: boolean) => {
    if (!next && open) dismissUntil(1)
    setOpen(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton
        className="sm:max-w-md border-emerald-100 bg-gradient-to-b from-emerald-50/90 to-white p-0 overflow-hidden"
      >
        <div className="px-5 pt-5 pb-1">
          <DialogHeader className="items-center text-center gap-3">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 shadow-sm"
              aria-hidden
            >
              <Sprout className="h-7 w-7" />
            </div>
            <p className="text-xs font-medium text-emerald-700/90 tracking-wide">BETA</p>
            <DialogTitle className="text-lg font-semibold text-gray-900 leading-snug">
              {SITE_NAME}는 아직 둥지 튼는 중이에요
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600 leading-relaxed text-center max-w-sm">
              지금은 <strong className="font-medium text-gray-800">베타</strong>로 운영하고 있어요.
              기업마당·K-Startup·중소벤처24 공고를 모아 드리지만, 수집 시점이나 조건에 따라{' '}
              <strong className="font-medium text-gray-800">검색 결과가 완벽하지 않을 수 있어요.</strong>
              <br />
              <span className="mt-2 block text-gray-500">
                불편한 점이 보이면 알려주시면, 둥지를 조금씩 더 포근하게 다듬을게요.
              </span>
            </DialogDescription>
          </DialogHeader>
        </div>

        <ul className="mx-5 mt-3 space-y-1.5 text-xs text-gray-500 bg-white/70 rounded-lg border border-emerald-100/80 px-3 py-2.5">
          <li>· 마감·신규 공고 반영에는 시간이 걸릴 수 있어요</li>
          <li>· 자격 판정은 참고용이며, 최종 확인은 공고 원문을 봐 주세요</li>
        </ul>

        <DialogFooter className="border-t border-emerald-100/80 bg-emerald-50/40 px-5 py-4 flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto border-emerald-200 text-emerald-900 hover:bg-emerald-50"
            onClick={() => {
              dismissUntil(1)
              setOpen(false)
            }}
          >
            오늘은 그만 볼게요
          </Button>
          <Button
            type="button"
            className="w-full sm:w-auto bg-emerald-700 hover:bg-emerald-800"
            onClick={() => {
              dismissUntil(7)
              setOpen(false)
            }}
          >
            알겠어요, 둥지로 갈게요
          </Button>
        </DialogFooter>

        <p className="text-center text-[11px] text-gray-400 pb-4 px-5">
          <Link href="/guide" className="underline underline-offset-2 hover:text-emerald-700">
            이용 안내
          </Link>
          {' · '}
          <Link href="/report/quick" className="underline underline-offset-2 hover:text-emerald-700">
            제보하기
          </Link>
        </p>
      </DialogContent>
    </Dialog>
  )
}
