-- Phase 12-3-1: 공고 업종 태그 (검색·자격 매칭용)
alter table public.support_programs
  add column if not exists industry_tags text[] default null;

create index if not exists support_programs_industry_tags_gin_idx
  on public.support_programs using gin (industry_tags);

comment on column public.support_programs.industry_tags is
  '표준 업종 태그 배열 (lib/industry/canonical CANONICAL_INDUSTRIES)';
