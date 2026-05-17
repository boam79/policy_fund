-- Phase 12-2-4: 진단 세션 (짧은 URL ?sid=)
-- Supabase SQL Editor에서 1회 실행

create table if not exists public.diagnosis_sessions (
  id uuid primary key default gen_random_uuid(),
  raw_query text,
  parsed_payload jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists diagnosis_sessions_expires_at_idx
  on public.diagnosis_sessions (expires_at);

alter table public.diagnosis_sessions enable row level security;

-- 서비스 롤·API Route 전용 (anon 직접 접근 차단)
create policy "diagnosis_sessions_service_only"
  on public.diagnosis_sessions
  for all
  using (false)
  with check (false);
