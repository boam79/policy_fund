# 지원둥지 — Planner Scratchpad

**역할**: Planner 주도 계획 / Executor는 사용자 승인 후 단계별 실행  
**기준 문서**: `policyfund_v2_prd_v2_0_free_plan_db_switch_ready.md` (PF-WEB-001 v2.0, 2026-05-11) — 문서 내 과거 명칭 PolicyFund AI는 제품 코드명 참고용이며, **사용자 노출 브랜드는 지원둥지**로 통일함 (2026-05-16).  
**UI 목업 기준**: `KakaoTalk_Photo_2026-05-11-18-15-52 001.png` (관리자 대시보드), `KakaoTalk_Photo_2026-05-11-18-15-53 002.png` (사용자 홈)  
**Planner 최종 갱신**: 2026-05-15

---

## Background and Motivation

PolicyFund AI v2는 기존 GitHub Pages 단일페이지 MVP(`policyfundapp`)의 구조적 한계를 해소하는 **신규 웹서비스 개발** 프로젝트다.

### 기존 MVP의 핵심 문제점

| 우선순위 | 문제 | 영향 |
|---|---|---|
| 긴급 | Anthropic API Key 프론트 노출 시도 | 보안 취약 |
| 긴급 | CORS로 LLM 호출 실패 → 전원 fallback 결과 | 서비스 신뢰도 0 |
| 높음 | 실제 공고 데이터 없음 → 가상 결과 | 사용자 오도 위험 |
| 높음 | `debtRatio` 하드코딩 200 | 결과 차별화 불가 |

### 신규 서비스 핵심 가치

- **실제 공공 API 기반**: 기업마당 · K-Startup · 중소벤처24 연동
- **서버 전용 보안**: 모든 API 키는 Next.js API Routes에서만 사용
- **LLM 역할 제한**: 조건 추출 + 설명 보완에만 사용 (공고 생성·검색 금지)
- **무료 플랜 기반 운영**: Vercel Hobby + Supabase Free (500MB 한도 내 설계)
- **원클릭 DB 전환 구조**: `api_minimal_cache` → `db_centric` 모드 전환 준비

---

## Key Challenges and Analysis

1. **무료 플랜 한도**: Supabase Free 500MB 초과 시 read-only 트리거 — 공고 원문 전체 저장 금지, 핵심 필드만 저장
2. **공공 API 안정성**: 기업마당/K-Startup은 즉시 사용 가능, 중소벤처24는 서버 IP 등록 필요 → Phase 후반 활성화
3. **LLM 환각 방지**: 자격판정 상태값(`likely_eligible` 등)은 룰 엔진이 결정, LLM은 설명 문구만 생성
4. **데이터 운영 이원화**: 현재 `api_minimal_cache` → 향후 유료 전환 시 `db_centric` 원클릭 전환 구조 필수
5. **표준 필드명 통일**: 자연어 입력·API 요청·DB 간 필드명 혼재 방지 (`bizAge` → `business_age_years` 등)
6. **반복 오류 재발**: 수동 점검만으로는 동일 결함이 다른 경로에서 재출현하므로, 로그 표준화+회귀 테스트가 필요

### 반복 오류 방지 전략 (Planner 확정)

- API 오류 응답 표준: `error_code`, `trace_id`, `step`, `message`를 공통 필드로 반환
- 사용자 여정 단계 로그: 홈→진단→검색→상세→자격판정→문서생성 단계별 핵심 분기 기록
- 회귀 테스트 의무화: 버그 1건 수정 시 해당 재현 케이스 테스트 1건 추가
- 배포 게이트 강화: 빌드 성공 + 핵심 유저스토리 자동 검증 통과 시 배포

---

## 재분석 결과 — 현재 저장소 상태 (2026-05-15 기준)

### 커밋 이력

| 커밋 | 내용 | 날짜 |
|---|---|---|
| `05b5837` | docs(readme): 버전 정책 및 변경 이력(0.1.0–0.1.1) 추가 | 2026-05-09 |
| `e6f2cec` | docs: Executor 피드백에 초기 푸시 기록 추가 | 2026-05-09 |
| `ef7f9bf` | chore: 초기 계획 문서 및 환경 변수 예시 추가 | 2026-05-09 |

→ **3개 커밋 모두 문서/설정 전용. 실제 Next.js 앱 코드 없음.**

### 로컬 미커밋 변경사항

| 파일 | 상태 | 비고 |
|---|---|---|
| `.cursor/scratchpad.md` | modified | 2026-05-11 재작성, 미커밋 |
| `README.md` | **deleted** | 로컬에서 삭제됨, 미커밋 — 복구 또는 재작성 필요 |
| `KakaoTalk_Photo_2026-05-11-18-15-52 001.png` | untracked | 관리자 UI 목업 이미지 |
| `KakaoTalk_Photo_2026-05-11-18-15-53 002.png` | untracked | 사용자 홈 UI 목업 이미지 |
| `policyfund_v2_prd_v2_0_free_plan_db_switch_ready.md` | untracked | PRD v2.0 — 미커밋 |

### `.env.example` 현재 상태 (확인 완료)

```env
BIZINFO_API_KEY=
PUBLIC_DATA_SERVICE_KEY=
SMES24_API_KEY=
SMES24_API_BASE=https://www.smes.go.kr/fnct/apiReqst/extPblancInfo
SMES24_DEFAULT_STRDT=
SMES24_DEFAULT_ENDDT=
ANTHROPIC_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
CRON_SECRET=
GOV_MCP_JSON_PRETTY=
PAYMENT_SECRET_KEY=
```

→ PRD §10과 대체로 일치. **SMES24 관련 변수 3개가 PRD보다 상세하게 이미 추가되어 있음.**

### 결론: 현재 개발 착수 전 상태

- 계획 문서(PRD v2.0, 목업 2장, scratchpad)는 완비
- Next.js 앱 코드는 전무 — Phase 1 스캐폴딩 착수 필요
- README.md 삭제 상태 — Phase 1 완료 시점에 함께 재작성 권장

---

## 확정된 설계 원칙 (PRD v2.0 기준)

### 데이터 운영 모드

| 모드 | 설명 | 사용 시점 |
|---|---|---|
| `api_minimal_cache` | 공공 API 조회 + 최소 캐시만 Supabase 저장 | **현재 v1 (무료 플랜)** |
| `db_centric` | 공공 API 전체 정기 수집 후 DB 중심 검색 | 유료 플랜 전환 후 |

### 라우트 구조 (정본)

| 화면 | 경로 | App Router 파일 |
|---|---|---|
| 홈 (자연어 검색 + 추천 배너) | `/` | `app/page.tsx` |
| 조건 확인 · 보완 | `/diagnosis` | `app/diagnosis/page.tsx` |
| 빠른 AI 진단 결과 | `/report/quick` | `app/report/quick/page.tsx` |
| 실제 공고 검색 결과 | `/search` | `app/search/page.tsx` |
| 공고 상세 | `/search/[id]` | `app/search/[id]/page.tsx` |
| 계획서 생성 | `/documents/plan` | `app/documents/plan/page.tsx` |
| 심사 점수 예측 | `/evaluate` | `app/evaluate/page.tsx` |
| 내 신청 관리 | `/manage` | `app/manage/page.tsx` |
| 서비스 소개 | `/about` | `app/about/page.tsx` |
| 이용안내 | `/guide` | `app/guide/page.tsx` |
| 요금제 | `/pricing` | `app/pricing/page.tsx` |
| 이용약관 | `/terms` | `app/terms/page.tsx` |
| 개인정보처리방침 | `/privacy` | `app/privacy/page.tsx` |
| 법적 고지 | `/disclaimer` | `app/disclaimer/page.tsx` |
| 환불정책 | `/refund-policy` | `app/refund-policy/page.tsx` |
| 고객센터 | `/contact` | `app/contact/page.tsx` |
| FAQ | `/faq` | `app/faq/page.tsx` |
| 로그인 | `/login` | `app/login/page.tsx` |
| 회원가입 | `/signup` | `app/signup/page.tsx` |
| 마이페이지 | `/mypage` | `app/mypage/page.tsx` |
| 관리자 대시보드 | `/admin` | `app/admin/page.tsx` |

### 표준 CompanyProfile 필드 (API·DB 공통)

| 표준 필드명 | 타입 | 설명 |
|---|---|---|
| `region` | string | 지역 (예: "경기도") |
| `city` | string \| null | 시·군·구 |
| `industry` | string | 업종 |
| `business_age_years` | number \| null | 업력 (년) |
| `employee_count` | number \| null | 직원 수 |
| `annual_revenue_krw` | number \| null | 연매출 (원 단위 정수) |
| `credit_score` | number \| null | 신용점수 |
| `tax_arrears` | boolean \| null | 세금 체납 여부 |
| `desired_amount_krw` | number \| null | 신청 희망 금액 (원 단위 정수) |
| `support_purpose` | string \| null | 지원 목적 |
| `business_type` | string \| null | 개인/법인 구분 |
| `startup_stage` | string \| null | 창업 단계 |

### 핵심 API Route 목록

| Route | Method | 설명 |
|---|---|---|
| `/api/query/parse` | POST | 자연어 → 조건 추출 (LLM) |
| `/api/search` | POST | DB/공공 API 기반 공고 검색 |
| `/api/programs/[id]` | GET | 공고 상세 조회 |
| `/api/home/recommendations` | GET/POST | 홈 AI 추천 배너 데이터 |
| `/api/programs/trending` | GET | 마감임박·신규·인기 공고 |
| `/api/eligibility` | POST | 룰 기반 자격판정 |
| `/api/documents/checklist` | POST | 서류 체크리스트 생성 |
| `/api/documents/timeline` | POST | 신청 타임라인 생성 |
| `/api/documents/plan` | POST | 사업계획서 초안 생성 |
| `/api/evaluate/startup` | POST | 심사 점수 예측 |
| `/api/evaluate/quality` | POST | 계획서 품질 측정 |
| `/api/export/csv` | POST | CSV 파일 생성 |
| `/api/export/xlsx` | POST | XLSX 파일 생성 |
| `/api/admin/sync` | POST | 공고 동기화 (Cron + 수동) |
| `/api/admin/dashboard` | GET | 관리자 KPI 데이터 |
| `/api/admin/programs` | GET | 관리자 공고 목록 |
| `/api/admin/programs/[id]` | GET/PATCH | 공고 상세/상태 수정 |
| `/api/admin/recommendations/home-slots` | GET/PATCH | 홈 배너 슬롯 관리 |
| `/api/contact` | POST | 고객 문의 접수 |
| `/api/feedback` | POST | 피드백 수집 |

---

## High-level Task Breakdown

각 Phase는 **한 번에 하나만** Executor가 수행하고, 성공 기준 충족 후 사용자 검증 후 다음 단계로 진행한다.

---

### Phase 1 — 프로젝트 기반 구축 ✅ **완료** (2026-05-15)

**목표**: Next.js 앱 스캐폴딩 + Vercel 배포 + Supabase 연결 + README 재작성

#### 태스크

- [x] **1-1** `create-next-app` 실행 (Next.js 16.2.6 · App Router · TypeScript · Tailwind v4)
- [x] **1-2** shadcn/ui v4 초기화 및 기본 컴포넌트 설치 (Button, Card, Input, Badge, Dialog 등 13개)
- [x] **1-3** `.env.example` 검토 완료, `.env.local` 생성 (Supabase anon key 등록)
- [x] **1-4** `lib/supabase/client.ts`, `server.ts`, `admin.ts` 생성 + Supabase 프로젝트 생성 (hwqsxarzgodpsvwahzae, ap-northeast-2)
- [x] **1-5** 공통 레이아웃 `Header.tsx` · `Footer.tsx` + 21개 페이지 플레이스홀더 생성
- [ ] **1-6** Vercel 프로젝트 연결 + 환경변수 등록 + 첫 배포 성공 확인 ← **사용자 확인 필요**
- [x] **1-7** `README.md` 재작성 (PRD v2.0 기준, v0.2.0 변경 이력 포함)
- [ ] **1-8** 변경사항 커밋 (`v0.2.0` 마일스톤 태깅) ← **사용자 확인 후 진행**

**성공 기준**
- ✅ `npm run build` 성공 (21개 페이지 빌드 확인)
- ⬜ Vercel 배포 URL에서 홈 화면 노출 확인
- ✅ `README.md` 존재 (삭제 상태 해소)
- ✅ Supabase 프로젝트 생성 + anon key 연결 확인

---

### Phase 2 — 핵심 DB 스키마 구축

**목표**: Supabase에 서비스 운영에 필요한 핵심 테이블 마이그레이션

#### 태스크

- [ ] **2-1** `support_programs` 테이블 생성 + 검색용 인덱스 (status, visibility_status, application_end_date)
- [ ] **2-2** `business_profiles` 테이블 생성
- [ ] **2-3** `diagnoses`, `eligibility_checks`, `generated_documents` 테이블 생성
- [ ] **2-4** `search_sessions`, `search_session_results` 테이블 생성
- [ ] **2-5** `home_recommendation_slots`, `program_impressions` 테이블 생성
- [ ] **2-6** `customer_inquiries`, `feedback`, `policy_documents` 테이블 생성
- [ ] **2-7** `system_settings` 테이블 생성 + `data_mode = 'api_minimal_cache'` 기본값 삽입
- [ ] **2-8** `program_sync_logs`, `api_sync_logs` 테이블 생성
- [ ] **2-9** `file_exports` 테이블 생성
- [ ] **2-10** `admin_activity_logs`, `system_alerts` 테이블 생성
- [ ] **2-11** 전체 테이블 RLS 정책 적용 (PRD §16.10 기준)

**성공 기준**
- Supabase 대시보드에서 전체 테이블 확인
- RLS 적용 확인 (본인 데이터만 접근, 공개 테이블 읽기 허용)
- `system_settings.data_mode = 'api_minimal_cache'` 기본값 확인

---

### Phase 3 — 자연어 검색 UX 핵심 흐름

**목표**: 홈 화면 자연어 검색 → 조건 추출 → 조건 확인 카드 흐름 구현

#### 태스크

- [ ] **3-1** 홈 화면 (`/`) UI 구현 — Hero + 자연어 검색창 + 조건 추출 칩 (목업 002.png 기준)
- [ ] **3-2** `lib/llm/claude.ts`, `lib/query/parseNaturalLanguage.ts` 구현
- [ ] **3-3** `/api/query/parse` 구현 — LLM 자연어 조건 추출 (표준 필드명 기준)
- [ ] **3-4** 조건 확인 카드 UI (`/diagnosis`) — 추출값 확인·수정 + 부족 정보 보완
- [ ] **3-5** 방식 선택 UI — "빠른 AI 진단 (3초)" vs "실제 공고 맞춤 검색 (10~20초)"
- [ ] **3-6** 빠른 AI 진단 결과 화면 (`/report/quick`) — 점수·등급·법적 고지 문구

**성공 기준**
- 자연어 입력 → 조건 추출 → 카드 표시 흐름 E2E 작동
- 추출 조건 수정 가능
- 빠른 진단 결과 화면에 법적 고지 문구 필수 표시
- 금액 표시는 `formatKRW()` 포맷터 적용

---

### Phase 4 — 공고 DB 동기화 + 추천 배너

**목표**: 공공 API 연동 + Supabase 저장 + 홈 추천 배너 실제 데이터 표시

#### 태스크

- [x] **4-1** `lib/gov-support/clients/bizinfo.ts` — 기업마당 API 클라이언트
- [x] **4-2** `lib/gov-support/clients/kstartup.ts` — K-Startup API 클라이언트
- [x] **4-3** `lib/gov-support/core/normalizer.ts` — API 응답 → 표준 필드 정규화 (PRD §19.3)
- [x] **4-4** `lib/gov-support/core/dedup.ts` — Jaccard 유사도(≥0.7) 중복 제거
- [x] **4-5** `/api/admin/sync` — 기업마당+K-Startup 병렬 수집 + upsert + `api_sync_logs` 기록
- [x] **4-6** `/api/home/recommendations` — 30분 ISR 추천 배너 API
- [x] **4-7** `ProgramBannerCard.tsx` — 마감임박 D-day 배지 포함 공고 카드
- [x] **4-8** 홈 화면(`/`) — Suspense + Supabase 직접 쿼리로 실제 공고 배너 통합

**성공 기준**
- 관리자 수동 동기화 1회 후 `support_programs`에 샘플 공고 저장 확인
- 홈 배너에 실제 공고 카드 3~6개 표시 (LLM 생성 공고 없음)
- 배너 조회 조건: `status in ('active','closing_soon') AND visibility_status = 'visible'`

---

### Phase 5 — 실제 공고 검색 + 자격판정

**목표**: DB 기반 공고 검색 + 룰 기반 자격판정 파이프라인

#### 태스크

- [ ] **5-1** `lib/gov-support/tools/unifiedSearch.ts` — 통합 검색 (DB 우선, API fallback)
- [ ] **5-2** `/api/search` — 조건 기반 공고 검색·필터·정렬 + `search_sessions` 저장
- [ ] **5-3** 공고 검색 결과 화면 (`/search`) — 카드 목록 + 자격 상태 배지
- [ ] **5-4** `lib/gov-support/tools/eligibility.ts` — 룰 기반 자격판정 엔진 (PRD §21.5 기준)
- [ ] **5-5** `/api/eligibility` — 룰 판정 + LLM 설명 보완 + `eligibility_checks` 저장
- [ ] **5-6** 공고 상세 화면 (`/search/[id]`) — 공고 정보 + 자격판정 결과 + 법적 고지

**성공 기준**
- 조건 입력 → 공고 목록 + `likely_eligible` / `review_needed` / `likely_ineligible` / `unknown` 배지 표시
- LLM이 자격판정 상태값을 직접 결정하지 않음 (룰 엔진 결정 후 LLM 설명만)
- 모든 결과 화면에 법적 고지 문구 표시

---

### Phase 6 — 서류·타임라인·사업계획서 생성

**목표**: 공고 선택 후 신청 준비 문서 일괄 생성 + `generated_documents` 저장

#### 태스크

- [ ] **6-1** `lib/gov-support/tools/documentChecklist.ts` — 표준 서류 DB(15종) 매칭
- [ ] **6-2** `lib/gov-support/tools/timeline.ts` — 마감일 역산 9단계 타임라인
- [ ] **6-3** `lib/gov-support/tools/draftTools.ts` — 사업계획서 초안 (`gov` / `psst` 템플릿)
- [ ] **6-4** `/api/documents/checklist`, `/api/documents/timeline`, `/api/documents/plan` 구현
- [ ] **6-5** 계획서 생성 화면 (`/documents/plan`) — 템플릿 선택 + 생성 + 미리보기
- [ ] **6-6** `generated_documents` 저장

**성공 기준**
- 공고 선택 → 서류 체크리스트·타임라인·계획서 초안 각 1건 생성·저장 확인
- gov 템플릿(6섹션 공문서) / psst 템플릿(PSST 4축 12소섹션) 각각 작동

---

### Phase 7 — 심사 점수 예측 + CSV/XLSX 내보내기

**목표**: 계획서 품질 측정 → 심사 점수 예측 → 파일 내보내기

#### 태스크

- [ ] **7-1** `lib/gov-support/tools/assessQuality.ts` — PSST 품질 측정 (30/30/20/20)
- [ ] **7-2** `lib/gov-support/tools/evaluateStartup.ts` — 루브릭 심사 점수 (100점 + 가점 5점)
- [ ] **7-3** `/api/evaluate/quality`, `/api/evaluate/startup` 구현
- [ ] **7-4** 심사 점수 예측 화면 (`/evaluate`) — 루브릭 점수 + 보완 코멘트 + 예상 질문
- [ ] **7-5** `/api/export/csv`, `/api/export/xlsx` 구현 (Google Sheets API 미사용)
- [ ] **7-6** `file_exports` 저장 + 24시간 만료 처리

**성공 기준**
- 계획서 → 품질 점수 → 심사 점수 예측 순서 E2E 재현
- CSV/XLSX 다운로드 작동 확인
- Google Sheets API 미사용 확인

---

### Phase 8 — 운영 필수 페이지 + 관리자 MVP

**목표**: 법적 필수 페이지 전체 + 관리자 콘솔 기본 기능 (목업 001.png 기준)

#### 태스크

- [ ] **8-1** `/about`, `/guide`, `/terms`, `/privacy`, `/disclaimer`, `/refund-policy`, `/contact`, `/faq` 페이지 구현
- [ ] **8-2** 관리자 공통 레이아웃 (좌측 사이드바 + 상단 헤더, 목업 001.png 기준)
- [ ] **8-3** 관리자 대시보드 KPI 카드 (`/admin/dashboard`) — 총 공고수·동기화·배너 노출·문의·결제·오류
- [ ] **8-4** 공고 QA 목록·상세·동기화 관리 (`/admin/programs/*`)
- [ ] **8-5** 홈 추천 배너 슬롯 관리 (`/admin/recommendations/home-slots`)
- [ ] **8-6** 문의·피드백 관리 (`/admin/inquiries`, `/admin/feedback`)
- [ ] **8-7** 콘텐츠 관리 (`/admin/content/*`) — FAQ·이용안내·정책문서
- [ ] **8-8** 운영 모드 설정 (`/admin/settings`) — `api_minimal_cache` ↔ `db_centric` 전환 UI

**성공 기준**
- 법적 필수 페이지 전체 접근 가능
- 관리자 로그인 후 대시보드 KPI 확인 가능
- 수동 동기화 버튼 작동 + `program_sync_logs` 기록 확인

---

### Phase 9 — 로그인·회원가입·마이페이지

**목표**: Supabase Auth 기반 인증 흐름 + 사용자 프로필 관리

#### 태스크

- [ ] **9-1** 로그인 (`/login`), 회원가입 (`/signup`), 비밀번호 재설정 페이지
- [ ] **9-2** Supabase Auth 이메일/소셜 로그인 연동
- [ ] **9-3** 마이페이지 (`/mypage`) — 프로필·사용량·생성 문서 확인
- [ ] **9-4** 내 신청 관리 (`/manage`) — 관심 공고·알림 프로파일 CRUD

**성공 기준**
- 회원가입 → 로그인 → 마이페이지 E2E 흐름 작동
- `business_profiles` 저장·수정 확인

---

### Phase 10 — 결제·구독 (선택 / 후순위)

**목표**: 요금제 도입 및 결제 연동 (상용 서비스 전환 시)

#### 태스크

- [ ] **10-1** 요금제 화면 (`/pricing`)
- [ ] **10-2** 토스페이먼츠 또는 포트원 결제 연동
- [ ] **10-3** `subscriptions`, `payments`, `usage_events` 운영
- [ ] **10-4** 사용량 제한 미들웨어

**성공 기준**
- 결제 → 구독 상태 업데이트 → 기능 개방 흐름 작동

---

### Phase 11 — 엄격 유저스토리 + 오류 재발 방지 체계 (신규)

**목표**: 반복 오류를 구조적으로 차단하고 동일 결함의 재발을 자동 감지

#### 태스크

- [ ] **11-1** 핵심 유저스토리 15개를 엄격 시나리오(정상/경계/실패)로 고정
- [ ] **11-2** API 오류 표준 스키마 적용 (`error_code`, `trace_id`, `step`)
- [ ] **11-3** 공통 로깅 유틸 추가 + 민감정보 마스킹 규칙 적용
- [ ] **11-4** 과거 반복 버그 회귀 테스트 세트 구축
- [ ] **11-5** E2E 자동화 (검색→진단→자격→문서 여정)
- [ ] **11-6** 배포 전 품질 게이트 스크립트 구축 (`verify:story`)

**성공 기준**
- 동일 오류 재발 시 `trace_id`로 1분 내 역추적 가능
- 핵심 유저스토리 자동 테스트 통과율 100%
- 과거 반복 이슈가 회귀 테스트에서 즉시 탐지

---

## Project Status Board

### 완료

- [x] PRD v2.0 확정 (PF-WEB-001 v2.0, 2026-05-11)
- [x] UI/UX 목업 확정 (관리자 목업 001.png + 사용자 홈 목업 002.png)
- [x] 라우트 구조 확정 (PRD §8.1 기준)
- [x] DB 스키마 설계 확정 (PRD §9 기준, 20+ 테이블)
- [x] 데이터 운영 모드 확정 (`api_minimal_cache` 기본, `db_centric` 전환 준비)
- [x] `.env.example` 작성 완료 (SMES24 상세 변수 포함)
- [x] `.gitignore` 설정 완료
- [x] Git 저장소 초기화 + 원격 연결 (`https://github.com/boam79/policy_fund`)
- [x] Scratchpad Planner 재수립 (2026-05-15)
- [x] **Phase 1** — 프로젝트 기반 구축 완료 (2026-05-15)
  - Next.js 16.2.6 (App Router · TypeScript · Tailwind v4) 스캐폴딩
  - shadcn/ui v4 초기화 (13개 컴포넌트)
  - Supabase 프로젝트 생성 (`hwqsxarzgodpsvwahzae`, ap-northeast-2)
  - `lib/supabase/client.ts`, `server.ts`, `admin.ts` 구현
  - Header · Footer 공통 레이아웃
  - 홈 화면 UI (Hero · 추천 배너 · 4단계 흐름 · CTA)
  - 21개 페이지 플레이스홀더
  - README.md 재작성

### 진행 중

- [ ] **Phase 11-1** — 엄격 유저스토리 15개 정의 (Planner)
- [ ] **Phase 11-2** — 오류 로그 표준 스키마 확정 (Planner)

### 대기 중 (우선순위 순)

- [x] Phase 2 — DB 스키마 구축 ✅ 완료 (2026-05-15)
- [x] Phase 3 — 자연어 검색 UX ✅ 완료 (2026-05-15)
- [x] Phase 4 — 공고 동기화 + 추천 배너 ✅ 완료 (2026-05-15)
- [ ] Phase 5 — 공고 검색 + 자격판정 ← **다음 착수**
- [ ] Phase 6 — 서류·타임라인·계획서 생성
- [ ] Phase 7 — 심사 점수 + CSV/XLSX 내보내기
- [ ] Phase 8 — 운영 필수 페이지 + 관리자 MVP
- [ ] Phase 9 — 인증·마이페이지
- [ ] Phase 10 — 결제·구독 (후순위)
- [ ] Phase 11 — 엄격 유저스토리 + 오류 재발 방지 체계

---

## Current Status / Progress Tracking

- **현재 모드**: Executor — Phase 4 완료, 사용자 검증 대기
- **저장소**: `https://github.com/boam79/policy_fund` · 로컬 `/Users/parkjaemin/Dev/policy_fund`
- **최신 커밋**: `558178b` (Phase 4 — 공고 DB 동기화 + 추천 배너)
- **Supabase 프로젝트**: `hwqsxarzgodpsvwahzae` (policyfund-ai-v2, ap-northeast-2, Free Plan)
- **데이터 운영 모드**: `api_minimal_cache`
- **Gemini API Key**: ✅ `.env.local`에 등록 완료
- **빌드 상태**: ✅ `npm run build` 성공 (25개 페이지, 30분 ISR)
- **공공 API 키 필요**:
  - `BIZINFO_API_KEY` — 기업마당 API 키 (bizinfo.go.kr 발급)
  - `PUBLIC_DATA_SERVICE_KEY` — K-Startup / 공공데이터포털 키 (data.go.kr 발급)
- **동기화 실행 방법**: `POST /api/admin/sync` (Authorization: Bearer dev-secret-2026)
- **다음 마일스톤**: Phase 5 — 실제 공고 검색 + 룰 기반 자격판정
- **2026-05-15 추가**: 공공 API 연동 보강 진행
  - K-Startup 엔드포인트를 `B552735/kisedKstartupService01/getAnnouncementInformation01`로 수정
  - 중소벤처24 기본 조회기간을 당월 기준으로 조정 + 타임아웃 시 최근 14일 재시도
  - 최신 로컬 동기화 결과: 기업마당 600건, K-Startup 10건, 중소벤처24 1035건, 업서트 127건, 오류 0건
- **2026-05-15 Planner 전환**: 반복 오류 재발 방지를 최우선 목표로 설정
  - 기능 확장보다 `오류 로그 표준화 + 엄격 유저스토리 회귀 테스트`를 선행
  - 즉시 다음 작업: Phase 11-1/11-2
- **2026-05-15 Executor 진행**: Phase 11-2 1차 구현 완료
  - 공통 유틸 추가: `lib/errors/apiError.ts` (`error_code`, `trace_id`, `step`, 표준 오류 응답)
  - 적용 API: `/api/query/parse`, `/api/search`, `/api/eligibility`, `/api/documents/checklist`, `/api/documents/timeline`, `/api/documents/plan`
  - 표준 오류 응답 및 `x-trace-id` 헤더 검증 완료 (로컬 3004 서버)
  - `verify:story` 자동 검증 스크립트 추가 (`scripts/verify-story.ts`) 및 PASS 확인
  - `verify:story`를 엄격 시나리오로 확장 (parse/search/eligibility/documents/admin/export/billing/webhook/rate-limit)
  - 확장 검증 PASS + `npm run build` PASS
  - 관리자 스토리 검증 스크립트 추가: `scripts/verify-admin-story.ts`
  - `verify:admin`, `verify:strict` 명령 추가 및 PASS 확인

---

## Executor's Feedback or Assistance Requests

- **2026-05-09**: 초기 커밋 `ef7f9bf`를 `origin/main`에 푸시 완료(SSH).
- **2026-05-11**: Scratchpad 최초 재작성 (PRD v2.0 기반).
- **2026-05-15**: Planner 재분석 — 저장소 상태 확인, README.md 삭제 이슈 발견, 계획 전면 갱신.
- **2026-05-15**: Executor — Phase 1 전체 완료. `npm run build` 성공 확인. Vercel 연결은 사용자가 직접 진행 필요.
  - ⚠️ **사용자 확인 필요**: Supabase 대시보드 > Settings > API 에서 `service_role` 키를 `.env.local`의 `SUPABASE_SERVICE_ROLE_KEY`에 입력하세요.
  - ⚠️ **Vercel 배포**: `vercel` CLI 또는 대시보드에서 GitHub 연결 후 환경변수 등록이 필요합니다.
  - 확인 완료 후 v0.2.0 커밋·태깅을 진행합니다.
- **2026-05-15**: Executor — "기업마당만 작동" 이슈 대응 완료.
  - K-Startup: 잘못된 API 베이스 URL/응답 필드 매핑 수정 후 수집 정상화(10건 확인)
  - 중소벤처24: 조회기간/재시도 로직 보강 후 수집 정상화(1035건 확인)
  - 정규화 매핑 업데이트로 `external_id null` 업서트 오류 해소
- **2026-05-15**: Executor — 회원가입 인증메일 미수신 이슈 1차 대응.
  - Supabase Auth 로그 확인 결과 `mail.send` 이벤트는 정상 기록됨(`noreply@mail.app.supabase.io` → 사용자 메일)
  - 이후 동일 이메일 재가입은 `user_repeated_signup`으로 처리되어 메일 자동 재발송이 되지 않음
  - `/signup` 완료 화면에 **"인증 메일 다시 보내기"** 버튼(`supabase.auth.resend`) 추가
- **2026-05-15 (Planner 지시)**: Executor 운영 규칙 추가
  - API 오류 응답에서 `error_code` 없는 반환 금지
  - 버그 수정 시 재현 테스트(회귀) 1건 이상 필수 추가
  - 배포 전 핵심 유저스토리 자동 검증 결과를 첨부
- **2026-05-16 (Executor)**: 요금제·사용량·보내기 정합 후속
  - `app/evaluate/page.tsx`: `handleExportEvaluation` 추가, `handleEvaluate`에서 `res.ok` / `data.ok === false` 시 `readApiError` 알림, 심사 결과보내기 문구 정리
  - `app/mypage/billing/page.tsx`: `usage.evaluation` 표시, `UsageBar`에서 `limit === 0` 시 나눗셈·표시 보정(미포함)
  - `app/api/export/user/route.ts`: XLSX 응답 본문을 `new Uint8Array(buf)`로 감싸 TS/Response 타입 통과
  - `npm run build`, `npm run verify:story`, `npm run verify:journey` — 모두 PASS (로컬 `localhost:3000` 기준)
- **2026-05-16**: 브랜드명 **지원둥지**로 사용자 노출·SEO·GEO(`llms.txt`·`ai.txt`)·메타·약관 등 통일. `SITE_BOT_USER_AGENT`, `EXPORT_FILE_PREFIX`, npm 패키지명 `jiwondungji`. launchd 번들 ID는 기존 설치 호환을 위해 `com.policyfund.sync` 유지. `npm run build` PASS.

---

## Lessons

- **비밀 관리**: API 키는 채팅·커밋·이 파일에 절대 기록 금지. 로컬은 `.env.local`, 프로덕션은 Vercel Env에만 설정.
- **LLM 역할 제한**: LLM은 공고 검색·생성 금지. 조건 추출·설명 보완·계획서 초안 생성에만 사용.
- **데이터 원칙**: 홈 추천 배너는 반드시 실제 공공 데이터 기반. LLM 생성 공고 샘플 사용 금지.
- **무료 플랜 한도**: Supabase Free 500MB 한도 내 설계. 공고 원문 전체 저장 금지. CSV/XLSX는 임시 생성 후 삭제.
- **중소벤처24**: 서버 IP 등록 전 타임아웃 — Phase 4에서 bizinfo+kstartup 우선 활성화, SMES24는 Phase 후반 플래그로 관리.
- **SMES24 환경변수**: `.env.example`에 `SMES24_API_BASE`, `SMES24_DEFAULT_STRDT`, `SMES24_DEFAULT_ENDDT` 이미 추가됨 — 코드 구현 시 그대로 사용.
- **README.md 삭제 주의**: 로컬에서 삭제됨, Phase 1 완료 시 PRD v2.0 기준으로 재작성 필요. ✅ 해소됨.
- **create-next-app 충돌**: 기존 파일이 있으면 `--yes`로도 실패. 임시 폴더에서 생성 후 rsync로 병합하는 방식 사용.
- **shadcn/ui v4 + base-ui**: `asChild` prop을 지원하지 않음. `buttonVariants()` + `cn()`을 Link에 직접 적용해야 함.
- **toast deprecated**: shadcn v4에서 toast 대신 sonner 사용.
- **Supabase MCP**: `confirm_cost_id` 파라미터명 사용 (구버전 `confirmation_id` 아님).
- **Executor 원칙**: 한 번에 한 태스크만 실행. 성공 기준 확인 후 사용자 검증 요청. 완료 전 다음 태스크 착수 금지.
- **K-Startup 주의**: `B553077/startup/SelectStartupPbancList`는 500 응답이 발생할 수 있어, `B552735/kisedKstartupService01/getAnnouncementInformation01` 사용을 기본으로 한다.
- **SMES24 주의**: 조회기간 조합에 따라 간헐 타임아웃이 발생하므로 당월 조회 + 최근 14일 재시도 전략을 적용한다.
- **정규화 주의**: K-Startup(`pbanc_sn`, `biz_pbanc_nm`)·SMES24(`pblancSeq`, `pblancDtlUrl`) 신규 필드를 우선 매핑해야 `external_id` null 오류를 피할 수 있다.
- **Auth 메일 주의**: 같은 이메일로 재가입 시 Supabase가 `user_repeated_signup` 처리하면서 확인 메일 재발송이 자동으로 되지 않을 수 있으므로, UI에 `auth.resend({ type: 'signup' })` 경로를 제공한다.
- **오류 추적 원칙**: 반복 오류 분석을 위해 API 오류 응답은 `error_code + trace_id + step`을 표준으로 유지한다.

---

## Phase 11 상세 계획 (Planner)

### 11-1. 엄격 유저스토리 15개 (정상/경계/실패)

| ID | 시나리오 | 유형 | 성공 기준 | 실패 시 필수 error_code |
|---|---|---|---|---|
| US-01 | 홈 자연어 검색 → 진단 이동 | 정상 | `diagnosis` 로드 + 조건 표시 | `PARSE_INVALID_INPUT` |
| US-02 | 진단 수정값 반영 후 실제 검색 | 정상 | `search.total > 0` 또는 fallback 안내 | `SEARCH_NO_RESULTS_HARD` |
| US-03 | 검색 0건 시 단계적 fallback | 경계 | `fallback_applied`가 null 아님 | `SEARCH_FALLBACK_EXHAUSTED` |
| US-04 | 검색 결과 카드 상세 이동 | 정상 | `/search/[id]` 진입 성공 | `NAV_DETAIL_LINK_BROKEN` |
| US-05 | 상세 → 자격판정 시작 | 정상 | `/eligibility?program_id=*` 진입 | `ELIGIBILITY_NAV_INVALID` |
| US-06 | 자격판정 실행(필수값) | 정상 | 200 + `status/score` 반환 | `ELIGIBILITY_CHECK_FAILED` |
| US-07 | 자격판정 결과 → 문서 CTA | 정상 | checklist/timeline/plan 이동 | `JOURNEY_NEXT_STEP_BROKEN` |
| US-08 | 문서 화면 자동 프리필 | 경계 | `program_id` 기반 title/deadline 채움 | `DOC_PREFILL_MISSING` |
| US-09 | 체크리스트 생성 | 정상 | `totalDocuments >= 1` | `DOC_CHECKLIST_EMPTY` |
| US-10 | 타임라인 생성 | 정상 | `milestones >= 1` | `DOC_TIMELINE_BUILD_FAILED` |
| US-11 | 사업계획서 초안 생성 | 정상 | `sections >= 1` | `DOC_PLAN_DRAFT_FAILED` |
| US-12 | 비로그인 관리자 API 접근 | 실패 | 401/403 반환 | `AUTH_ADMIN_REQUIRED` |
| US-13 | 비관리자 export 접근 | 실패 | 403 반환 | `AUTH_EXPORT_FORBIDDEN` |
| US-14 | 결제 confirm 위조 요청 | 실패 | 세션 불일치 차단 | `PAY_CONFIRM_UNAUTHORIZED_USER` |
| US-15 | webhook 위조 요청 | 실패 | secret/검증 실패로 차단 | `PAY_WEBHOOK_VERIFICATION_FAILED` |

### 11-2. 오류 코드 체계 v1

| Prefix | 도메인 | 예시 코드 |
|---|---|---|
| `PARSE_*` | 자연어 추출 | `PARSE_INVALID_INPUT`, `PARSE_RATE_LIMITED` |
| `SEARCH_*` | 검색/필터 | `SEARCH_NO_RESULTS_HARD`, `SEARCH_RATE_LIMITED` |
| `ELIGIBILITY_*` | 자격판정 | `ELIGIBILITY_PROGRAM_NOT_FOUND`, `ELIGIBILITY_CHECK_FAILED` |
| `DOC_*` | 문서 생성 | `DOC_PREFILL_MISSING`, `DOC_PLAN_DRAFT_FAILED` |
| `AUTH_*` | 인증/권한 | `AUTH_LOGIN_REQUIRED`, `AUTH_ADMIN_REQUIRED` |
| `PAY_*` | 결제/웹훅 | `PAY_CONFIRM_UNAUTHORIZED_USER`, `PAY_WEBHOOK_VERIFICATION_FAILED` |
| `ADMIN_*` | 운영 API | `ADMIN_DASHBOARD_READ_FAILED`, `ADMIN_SYNC_AUTH_FAILED` |
| `SYS_*` | 공통 시스템 | `SYS_INTERNAL_ERROR`, `SYS_DEPENDENCY_TIMEOUT` |

### 11-3. API 오류 응답 표준 스키마

```json
{
  "ok": false,
  "error_code": "SEARCH_NO_RESULTS_HARD",
  "message": "조건에 맞는 공고를 찾지 못했습니다.",
  "step": "search.query.execute",
  "trace_id": "trc_20260515_xxxxxxxx",
  "meta": {
    "fallback_applied": ["drop_keyword"],
    "hint": "지역/업종 조건을 완화해보세요."
  }
}
```

### 11-4. MCP 동원 검증 운영안

| 검증 축 | MCP/도구 | 목적 |
|---|---|---|
| 실사용 여정 E2E | `browser-use` | UI 흐름/클릭/전환/실패 재현 |
| DB/로그 확인 | `user-Supabase` | 테이블 상태, 오류 로그, RLS 확인 |
| 공공 API 점검 | `user-public-data-api-finder`, `user-gov-support-mcp` | 응답 포맷/필드 매핑 검증 |
| 법/정책 문구 | `user-korean-law` | 고지/약관 문구 정합 확인 |
| 배포 상태 점검 | `plugin-vercel-vercel` | 프로덕션 배포/로그 확인 |
| 런타임 점검 | Shell + API 스모크 | 배포 전후 회귀 자동 확인 |

### 11-5. 실행 순서 (Executor가 따를 순서)

1. 오류 코드 유틸 + trace id 생성기 추가  
2. `/api/query/parse`, `/api/search`, `/api/eligibility`, `/api/documents/*`에 표준 오류 스키마 적용  
3. 회귀 테스트(US-03, US-04, US-08, US-14, US-15) 우선 작성  
4. `verify:story` 스크립트 추가 후 배포 게이트에 연결  
5. 프로덕션에서 MCP 기반 E2E 재검증 후 결과 기록
