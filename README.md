# 지원둥지 (정부지원사업 검색·매칭)

실제 공공 데이터(기업마당, K-Startup, 중소벤처24)를 기반으로 정부지원사업을 검색/매칭하고,  
자격판정 및 신청 준비 문서(체크리스트, 타임라인, 사업계획서 초안)를 생성하는 웹서비스입니다.

- 저장소 버전: `0.2.1`
- 기준 문서: `policyfund_v2_prd_v2_0_free_plan_db_switch_ready.md` (PF-WEB-001 v2.0)
- 배포 URL: [https://policyfund-zeta.vercel.app](https://policyfund-zeta.vercel.app)

---

## PRD 기준 현재 구현 상태

아래는 PRD 주요 모듈 기준의 현재 구현 반영 상태입니다.

- 자연어 입력 → 조건 추출 → 조건 확인(`diagnosis`) 플로우 구현
- 실제 공고 검색(`search`) 및 공고 상세(`search/[id]`) 구현
- 공고별 자격판정(`eligibility`, `/api/eligibility`) 구현
- 신청 준비 문서 생성(`documents/plan`) 3종 구현
  - 사업계획서 초안
  - 서류 체크리스트
  - 신청 타임라인
- 자격판정 이후 다음 단계 CTA 여정 연결 완료
  - 자격판정 결과 → 체크리스트/타임라인/사업계획서 이동
  - 특정 공고 선택 → 신청 준비 바로가기
- 관리자 콘솔(`admin/*`): 대시보드·공고·동기화·문의·**회원 관리(플랜·이용량·접속자)**·결제·설정
- 회원 **현재 접속** 표시: 로그인 사용자 heartbeat → 관리자 회원 관리 화면(최근 3분 활동)
- 관리자 UI: 서비스용 상단 메뉴 제거, 사이드바+콘텐츠 전용 레이아웃
- 공고 동기화 검증·보강(`sync:verify`, `SYNC_HEAL_*`) 및 3출처 `smes24` 출처 코드 통일
- 베타: 로그인 회원 전 기능 이용(`BETA_ALL_ACCESS`), 사업계획서 페이지 로그인 유도
- 결제 기능은 `PAYMENT_PG_ENABLED` 플래그 기반으로 안전하게 비활성/활성 처리

---

## 핵심 사용자 여정

1. 홈에서 자연어로 검색 조건 입력
2. `diagnosis`에서 추출 조건 확인/수정
3. `search`에서 실제 공고 목록 탐색
4. 특정 공고 상세에서 `자격판정 시작하기`
5. `eligibility` 결과 확인 후 다음 단계로 이동
   - 서류 체크리스트
   - 신청 타임라인
   - 사업계획서 초안

문서 생성 화면은 `program_id`와 최근 여정 데이터(검색/프로필)를 자동 반영합니다.

---

## 기술 스택

- Framework: Next.js 16 (App Router), React 19, TypeScript
- UI: Tailwind CSS v4, shadcn/ui, lucide-react
- Backend: Next.js API Routes (서버 전용 로직)
- DB/Auth: Supabase (PostgreSQL, Auth, RLS)
- LLM: Google Gemini (`@google/genai`) + 룰 기반 폴백
- Payment: 네이버페이 JS SDK + 승인 API (플래그 기반 온/오프)
- Deploy: Vercel

---

## 아키텍처 요약

- `app/*`: 사용자/관리자 페이지
- `app/api/*`: 내부 API Route
- `lib/gov-support/*`: 공공 API 클라이언트 + 정규화/중복제거/검색/자격판정/문서 생성 로직
- `lib/query/*`: 자연어 조건 추출 및 폴백 파서
- `lib/supabase/*`: client/server/admin 클라이언트 분리

PRD 원칙에 따라, 검색 결과는 LLM이 생성하지 않고 실제 공공 데이터 + DB 캐시 기반으로 처리합니다.

---

## 주요 API Routes

- 검색/진단
  - `POST /api/query/parse`
  - `POST /api/search`
  - `POST /api/eligibility`
- 문서 생성
  - `POST /api/documents/checklist`
  - `POST /api/documents/timeline`
  - `POST /api/documents/plan`
- 운영/관리
  - `POST /api/admin/sync`
  - `GET /api/admin/dashboard`
  - `GET|PATCH /api/admin/inquiries`
  - `GET /api/admin/billing`
  - `GET /api/admin/users` · `GET /api/admin/users/summary` · `GET /api/admin/users/online` · `GET /api/admin/users/export` · `GET|PATCH /api/admin/users/[id]`
  - `GET /api/admin/nav-badges`
  - `GET /api/feedback`
- 접속 추적(로그인 사용자)
  - `POST /api/presence/heartbeat`

---

## 환경변수

아래 값은 실제 배포/운영 시 필수 또는 권장입니다. 민감값은 서버 환경변수로만 관리하세요.

### Public (클라이언트 노출 가능)

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL` (OAuth `redirectTo`와 맞춤: 예 `https://policyfund-zeta.vercel.app`, 로컬은 `http://localhost:3000`)
- `NEXT_PUBLIC_SITE_URL` (선택, canonical·OG 등과 동일 도메인 권장)
- `NEXT_PUBLIC_PAYMENT_PG_ENABLED`
- `NEXT_PUBLIC_NAVER_PAY_CLIENT_ID`
- `NEXT_PUBLIC_NAVER_PAY_CHAIN_ID`
- `NEXT_PUBLIC_NAVER_PAY_MODE` (`development` | `production`, 기본 development)
- `NEXT_PUBLIC_KAKAO_PAY_CID` (카카오페이 가맹점 CID, 클라이언트 결제 버튼 표시용)

### Supabase 소셜 로그인 (Google·카카오)

- Supabase 대시보드 **Authentication → Providers**에서 **Google**, **Kakao**를 켜고 각 플랫폼에서 발급한 Client ID·Secret을 입력합니다.
- **Authentication → URL Configuration**: Site URL과 Redirect URLs에  
  `https://<배포도메인>/auth/callback` 및 로컬 사용 시 `http://localhost:3000/auth/callback`을 추가합니다.
- 클라이언트는 `NEXT_PUBLIC_APP_URL`(또는 브라우저 `origin`)과 동일한 베이스로 위 콜백 URL을 구성합니다.

### Server Only (절대 클라이언트 노출 금지)

- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_URL` (admin 클라이언트에서 사용)
- `GEMINI_API_KEY`
- `BIZINFO_API_KEY`
- `PUBLIC_DATA_SERVICE_KEY` (K-Startup)
- `SMES24_API_KEY`
- `CRON_SECRET`
- `PAYMENT_PG_ENABLED`
- `NAVER_PAY_CLIENT_ID`
- `NAVER_PAY_CLIENT_SECRET`
- `NAVER_PAY_CHAIN_ID`
- `NAVER_PAY_MODE` (`development` | `production`)
- `NAVER_PAY_WEBHOOK_SECRET` (취소 알림용, 선택)
- `KAKAO_PAY_CID` (카카오페이 가맹점 CID)
- `KAKAO_PAY_SECRET_KEY` (카카오페이 REST API 시크릿 키, `Authorization: SECRET_KEY …` 헤더)
- `SMES24_API_BASE` (optional)
- `SMES24_DEFAULT_STRDT` (optional)
- `SMES24_DEFAULT_ENDDT` (optional)
- **동기화 — 실질적 전부 (Vercel·Supabase 무료 플랜)** (`lib/gov-support/sync/syncPolicy.ts`)
  - 기업마당: API `totCnt` 전부 · K-Startup: 모집 중(`Y`) 전부 · 중소벤처24: 최근 **730일**(기본)
  - **전량 수집은 로컬** `npm run sync` 권장 (페이지 무제한). Vercel 관리자 동기화는 출처당 페이지 상한.
  - `SYNC_PAGE_DELAY_MS` — 로컬 400ms, Vercel 기본 200ms
  - `SYNC_MAX_PAGES` — 출처별 상한(양수). 로컬은 비우면 무제한.
  - `SYNC_VERCEL_SAFE_MAX_PAGES` — Vercel 기본 **10** (Hobby 타임아웃 완화)
  - `SYNC_VERIFY_AFTER=1` — `npm run sync` 후 자동 검증 (기본 켜짐, `0`으로 끔)
  - `SYNC_HEAL_AFTER=1` — 검증 후 미저장 갭 자동 보강 (로컬 권장)
  - `SYNC_HEAL_MAX_IDS` — 보강 upsert 상한 (Vercel 기본 50, 로컬 500)
  - `npm run sync:verify` — 3출처 API↔DB 검증만 (동기화와 동일 기준)
  - `SYNC_BIZINFO_PAGE_UNIT`(≤100), `SYNC_KSTARTUP_NUM_ROWS`(≤100), `SYNC_SMES24_PAGE_SIZE`(≤500), `SYNC_SMES24_LOOKBACK_DAYS`(기본 730)

---

## 로컬 실행

```bash
npm install
npm run dev
```

빌드 검증:

```bash
npm run build
```

통합 스모크 테스트 (`npm run dev` 기동 후, `VERIFY_BASE_URL` 기본 `http://localhost:3000`):

```bash
npm run verify:strict
```

`verify:strict`에는 Wave 2~5·스토리·관리자·하드·여정 검증이 포함됩니다.

`POST /api/query/parse` **레이트리밋(429)** 전용 검증은 `verify:strict`에 넣지 않습니다. 동일 Node 프로세스에서 60초 창이 꽉 차면 직후 다른 parse 검증이 429로 깨질 수 있기 때문입니다. 필요할 때만 단독 실행하세요:

```bash
npm run verify:parse-rate
```

CI에서는 main 푸시 후 **선택 job**으로 `verify:parse-rate`를 두는 것을 권장합니다(필수 gate는 `verify:strict` + `build`).

공공 API 동기화 스크립트:

```bash
npm run sync
```

---

## 운영 원칙 (PRD 정합)

- 결과 데이터 출처: 공공 API + Supabase 캐시
- 자격판정: 룰 엔진 1차 판정 + LLM 설명 보완
- LLM 장애 시 폴백: 규칙 기반 조건 추출/처리
- 관리자 접근 제어: 지정 계정 기반 보호
- 결제 미연동 상태 안전 처리: PG 플래그로 명시적 차단

---

## 법적 고지

본 서비스의 검색/자격판정/문서 생성 결과는 참고용 정보입니다.  
실제 신청 가능 여부와 선정 여부는 각 기관의 공식 공고문 및 최종 심사 기준에 따릅니다.  
본 서비스는 선정 또는 지원금 수령을 보장하지 않습니다.

---

## 변경 이력

### 2026-05-18 (v0.2.1)

**관리자·운영**

- 관리자 화면에서 서비스용 헤더/푸터/베타 팝업 제거, **콘텐츠 영역 전용 상단 바**·스크롤 분리
- **회원 관리** 보강: KPI 카드, 플랜·구독·세그먼트 필터, CSV보내기, 회원 상세 드로어, 관리자 플랜 수동 변경
- **현재 접속 회원**: `user_presence` 테이블 + 클라이언트 heartbeat(45초) → 회원 관리 「현재 접속 N명」·목록(20초 갱신)
- 사이드바 배지: 문의·동기화 실패·중복 공고·구독 연체 등
- `/admin` 진입 시 `/admin/dashboard` 리다이렉트, `verify:admin`·`verify:journey-exhaustive` 확장

**동기화·데이터**

- 중소벤처24 출처 코드 **`smes24` 통일**(레거시 `smba` 호환)
- 동기화 후 **API↔DB 검증**(`npm run sync:verify`) 및 선택적 **자동 보강**(`SYNC_HEAL_*`)
- Vercel 관리자 동기화: 출처당 페이지 상한·지연으로 Hobby 타임아웃 완화

**검색·문서·베타 UX**

- `POST /api/query/parse`: LLM이 반환한 **영문 지역·지원목적을 한글로 정규화**, parse 캐시 v3
- `/documents/plan`: 비로그인 시 **로그인 유도 배너**·`next` 복귀, `verify:journey-documents` 추가
- 베타 안내 팝업(`NEXT_PUBLIC_BETA_NOTICE`), 베타 기간 로그인 회원 한도 완화(`BETA_ALL_ACCESS`)

**Phase 14 (이전 스프린트 포함)**

- 사업자 진위확인 API·UI, 공고 알림(`alert_profiles`), 기업마당 교차검증

### 2026-05-15

- 기업마당·K-Startup·중소벤처24 동기화를 **동일한 페이지네이션 규칙**으로 통일 (`lib/gov-support/clients/paginatedFetch.ts`)
- Vercel 기본 출처당 페이지 상한(타임아웃 완화)·로컬 무제한 및 `SYNC_*` 환경변수로 조정 가능
- 자격판정 후 다음 단계 CTA(체크리스트/타임라인/사업계획서) 연결
- `documents/plan`에 `program_id` 기반 공고 자동 프리필 연결
- 유저 여정 입력값 자동 채움 강화
- README를 PRD 기준 현재 구현 상태로 재정리
