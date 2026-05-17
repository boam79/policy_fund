# 진단 URL — `?sid=` vs 레거시 `?data=`

## 권장 (현재)

- 홈 자연어 검색 → `POST /api/diagnosis/session` → `/diagnosis?sid=<uuid>`
- 짧은 URL, 새로고침·공유 안정

## 레거시

- `/diagnosis?data=<encodeURIComponent(JSON)>` — 예전 북마크·외부 링크
- 앱이 로드 시 세션으로 저장한 뒤 `?sid=` URL로 **자동 치환** (Phase 13-P1-4)

## 하위 호환

- `?data=` 파싱 실패 시: 홈에서 다시 검색 안내
- `?sid=` 만료(410): 동일
