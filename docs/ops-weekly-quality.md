# 주간 데이터 품질 점검 (지원둥지 운영)

**주기**: 매주 1회 (월요일 권장)  
**담당**: 운영·관리자  
**대시보드**: `/admin/dashboard` → 데이터 품질 카드 · `/admin/programs` (품질·중복 탭)

## 1. API로 수치 확인

```bash
# 로컬 또는 프로덕션 (관리자 세션·Bearer 필요)
curl -s -H "Authorization: Bearer $ADMIN_SYNC_SECRET" \
  "$BASE_URL/api/admin/programs/quality" | jq
```

확인 항목:

| 지표 | 권장 임계 | 조치 |
|------|-----------|------|
| `region_null_pct` | &lt; 15% | 동기화·정규화 점검 |
| `missing_industry_tags_pct` | &lt; 40% (개선 중) | `npm run tag:industry` 배치 |
| `html_in_title_pct` | 0%에 가깝게 | `sanitizeProgramForClient`·소스 확인 |
| `duplicate_groups` | 주간 추이만 기록 | `/admin/programs` 중복 탭 |

## 2. 검색 신뢰 스모크 (수동 3분)

1. `/search` — 서울 · IT/소프트웨어 · 업력 3 · **업종 일치** → 결과 상단에 적용 조건·완화 배너 확인  
2. **엄격 검색**(Starter+) — `fallback_applied` 없음  
3. 카드 **판정 사유** 한 줄 노출 (업종 불일치 시 사유 확인)

자동: `npm run verify:strict` (배포 전 필수)

## 3. 동기화

- 최근 48h 동기화 실패: 관리자 사이드바 배지 확인  
- 실패 시: `POST /api/admin/sync` 또는 로컬 `npm run sync` (기업마당·K-Startup)
- **주간 교차검증** (관리자):
  1. `POST /api/admin/sync/verify` — DB·소스 불일치 목록 확인  
  2. 이슈 있으면 `POST /api/admin/sync/heal` — 자동 보정 (운영 시간 외 권장)  
  3. `npm run backfill:search-fields` — `region`·`application_url`·`search_text` 백필

## 4. SEO (월 1회 또는 배포 후)

- `npm run verify:seo` — `SITE_URL=https://policyfund-zeta.vercel.app`  
- [Google Search Console](https://search.google.com/search-console) 사이트맵·색인 상태

## 5. 기록

이슈 발견 시 GitHub Issue 또는 scratchpad `Executor's Feedback`에 날짜·지표·조치를 남깁니다.
