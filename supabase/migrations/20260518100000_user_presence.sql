-- 접속 추적: 클라이언트 heartbeat → 관리자가 현재 접속(근접) 회원 조회
create table if not exists public.user_presence (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null default '',
  last_seen_at timestamptz not null default now(),
  last_path text,
  updated_at timestamptz not null default now()
);

create index if not exists user_presence_last_seen_at_idx
  on public.user_presence (last_seen_at desc);

alter table public.user_presence enable row level security;

-- Data API 직접 접근 차단 (서버 API·service role만 사용)
revoke all on table public.user_presence from anon, authenticated;
