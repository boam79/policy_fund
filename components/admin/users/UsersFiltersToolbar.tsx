'use client'

import type { Dispatch, SetStateAction } from 'react'

export type UsersFiltersValues = {
  plan: string
  status: string
  inactiveDays: string
  minDocuments: string
  domain: string
  segment: string
  sort: string
}

type Props = {
  filters: UsersFiltersValues
  setFilters: Dispatch<SetStateAction<UsersFiltersValues>>
  onApply: () => void
  onReset: () => void
}

export function UsersFiltersToolbar({ filters, setFilters, onApply, onReset }: Props) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 mb-4 flex flex-wrap gap-2 items-end">
      <label className="text-xs text-gray-600">
        플랜
        <select
          value={filters.plan}
          onChange={(e) => setFilters((f) => ({ ...f, plan: e.target.value }))}
          className="mt-0.5 block text-sm border rounded-lg px-2 py-1.5"
        >
          <option value="all">전체</option>
          <option value="free">Free</option>
          <option value="starter">Starter</option>
          <option value="pro">Pro</option>
        </select>
      </label>
      <label className="text-xs text-gray-600">
        구독 상태
        <select
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          className="mt-0.5 block text-sm border rounded-lg px-2 py-1.5"
        >
          <option value="all">전체</option>
          <option value="none">없음</option>
          <option value="active">활성</option>
          <option value="trialing">체험</option>
          <option value="past_due">연체</option>
          <option value="canceled">해지</option>
        </select>
      </label>
      <label className="text-xs text-gray-600">
        정렬
        <select
          value={filters.sort}
          onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value }))}
          className="mt-0.5 block text-sm border rounded-lg px-2 py-1.5"
        >
          <option value="created_desc">가입일 최신</option>
          <option value="created_asc">가입일 오래된</option>
          <option value="last_sign_in_desc">최근 로그인</option>
          <option value="last_sign_in_asc">로그인 오래됨</option>
          <option value="docs_desc">문서 사용 많음</option>
        </select>
      </label>
      <label className="text-xs text-gray-600">
        세그먼트
        <select
          value={filters.segment}
          onChange={(e) => setFilters((f) => ({ ...f, segment: e.target.value }))}
          className="mt-0.5 block text-sm border rounded-lg px-2 py-1.5"
        >
          <option value="">없음</option>
          <option value="dormant">휴면(30일+)</option>
          <option value="high_usage">고사용</option>
          <option value="onboarding_dropout">온보딩 이탈(7일·문서0)</option>
        </select>
      </label>
      <label className="text-xs text-gray-600">
        미접속(일)
        <input
          type="number"
          min={0}
          value={filters.inactiveDays}
          onChange={(e) => setFilters((f) => ({ ...f, inactiveDays: e.target.value }))}
          placeholder="30"
          className="mt-0.5 block text-sm border rounded-lg px-2 py-1.5 w-20"
        />
      </label>
      <label className="text-xs text-gray-600">
        문서 최소
        <input
          type="number"
          min={0}
          value={filters.minDocuments}
          onChange={(e) => setFilters((f) => ({ ...f, minDocuments: e.target.value }))}
          className="mt-0.5 block text-sm border rounded-lg px-2 py-1.5 w-20"
        />
      </label>
      <label className="text-xs text-gray-600">
        도메인
        <input
          value={filters.domain}
          onChange={(e) => setFilters((f) => ({ ...f, domain: e.target.value }))}
          placeholder="gmail.com"
          className="mt-0.5 block text-sm border rounded-lg px-2 py-1.5 w-28"
        />
      </label>
      <button
        type="button"
        onClick={() => onApply()}
        className="text-sm px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500"
      >
        필터 적용
      </button>
      <button
        type="button"
        onClick={() => onReset()}
        className="text-sm px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
      >
        초기화
      </button>
    </div>
  )
}
