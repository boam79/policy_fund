-- 검색 전용 토큰 (URL ID·포털 호스트 등) — UI summary_text 와 분리
ALTER TABLE support_programs ADD COLUMN IF NOT EXISTS search_text text;

CREATE INDEX IF NOT EXISTS idx_support_programs_search_text ON support_programs (search_text);

COMMENT ON COLUMN support_programs.search_text IS 'Portal IDs and hosts for search only; not shown in UI';
