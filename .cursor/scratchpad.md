# PolicyFund AI v2 — Planner Scratchpad

**역할**: Planner 주도 계획 / Executor는 사용자 승인 후 단계 실행  
**기준 문서**: `~/Downloads/policyfund_v2_prd.md` (PF-WEB-001 v1.0, 2026-05-09)  
**최종 Planner 갱신**: 2026-05-09 — P0 라우트·프로필 스키마 확정 반영  

---

## Background and Motivation

PolicyFund AI v2는 GitHub Pages MVP(`policyfundapp`)의 한계(프론트 API 키, CORS, 가상 자격판정, Sheets 영속성)를 해소하고, **`gov_support_mcp` v1.2.3 로직을 Next.js `lib/gov-support/`로 이식**한 뒤 **Vercel + Supabase**로 상용화하는 것이 목표다.

핵심 가치 제안:

- 실제 공고 소스(기업마당·K-Startup·중소벤처24) 기반 검색·매칭
- 서버 전용 비밀·Route Handler로 보안 정렬(PR와 일치)
- 진단 후 **빠른 AI 진단** vs **실제 공고 맞춤 검색** 이원화로 신뢰와 속도 균형

---

## MCP 정찰 요약 (Planner가 2026-05-09 호출)

실행 가능했던 MCP와 결과·계획 반영:

| MCP 서버 | 활용 | 결과 요약 |
|----------|------|-----------|
| **user-public-data-api-finder** | 공공데이터 API 후보 | 중소벤처24 공고정보 API(`data.go.kr` 15113191 등) 후보 확인 → PRD SMES24 연계 근거 보강 |
| **user-context7** | Next.js·Supabase 문서 | `/vercel/next.js` Route Handler·`process.env` 서버 전용 패턴, `/supabase/supabase-js` 라이브러리 ID 확보 → Phase 1 스택 검증 |
| **user-korean-law** | 법령 식별자 | 「중소기업진흥에 관한 법률」 및 시행령·시행규칙 검색 성공 → 장기적으로 면책·정책근거 UI에 인용 후보(변호사 검토 전제) |
| **user-gov-support-mcp** | 통합 검색 스모크 | `bizinfo`+`kstartup`, 키워드「창업」, dedup 정상, 공고 메타·detailUrl 수신 → 이식 후 동일 계약으로 API 연결 가능성 높음 |
| **user-depreciation-mcp** | 부대 기능 후보 | 법인세 내용연수 참조 데이터 확인 → **코어 범위 밖**. 향후 「보조금 집행·정산 후 세무 참고」 확장 시만 검토 |

인증만 제공·이번 턴 미호출:

| MCP 서버 | 비고 |
|----------|------|
| **plugin-supabase-supabase**, **plugin-vercel-vercel**, **user-render** | `mcp_auth` 후 프로젝트 연결·배포 자동화 가능 → Executor Phase 1에서 필요 시 인증 |
| **cursor-ide-browser**, **user-playwright** | 검색·wizard E2E·스냅샷 검증에 Executor Phase 4~6에서 사용 |
| **user-Framelink Figma MCP** | UI 확정 시 디자인 토큰 반영 |
| **cursor-app-control** | 저장소 생성·워크스페이스 이동 시 사용 |

---

## Key Challenges and Analysis

1. ~~**라우트 명세 불일치**~~ → **P0 결정 사항**의 단일 라우트 표를 정본으로 채택. §4.1 다이어그램의 `/app/page.tsx`=wizard 표현은 **폐기**하고 홈·진단 분리.
2. ~~**7문항 vs 10문항**~~ → **API·타입 정본은 PRD §6.2 `companyProfile`**(필드 목록은 아래 P0.2). 구 MVP 「7문항」표기와 수치 불일치는 **문서 유물**로 처리하고, 확장 문항은 Phase 4 이후 옵션으로 후술.
3. **중소벤처24**: IP 허용 등 인프라 의존 — PRD대로 Phase 후반 플래그(`sources`에 `smes24` 가드) 권장.
4. **Supabase Auth와 `users` 테이블**: 문서의 `users`는 `auth.users`와 프로필 분리 패턴과 충돌 가능 — 마이그레이션에서 **트리거·RLS** 명세가 필요(Context7·공식 가이드로 Executor가 보완).
5. **법적 고지**: PRD §14 문구 + MCP 관측상 「중소기업진흥에 관한 법률」 등 상위 규범 존재 — **UI 고정 컴포넌트**로 노출, 법률 해석은 전문가 검토 전제.

---

## P0 결정 사항 (Planner 확정)

### P0.1 단일 라우트 표 — 프론트 (정본)

PRD §8.1을 채택하고 §4.1 화면 나열과 통합. **`/`는 랜딩 전용**, wizard는 **`/diagnosis`**로 고정.

| 화면 | 경로 | App Router 파일 | 다음 단계(네비) |
|------|------|-----------------|-----------------|
| 홈·소개 | `/` | `app/page.tsx` | → `/diagnosis` |
| 진단 wizard + 방식 선택 | `/diagnosis` | `app/diagnosis/page.tsx` | → `/report/quick` 또는 `/search` |
| 빠른 AI 진단 결과 | `/report/quick` | `app/report/quick/page.tsx` | 상담 CTA 등 |
| 실제 공고 검색 결과 | `/search` | `app/search/page.tsx` | → `/search/[id]` |
| 공고 상세·관련 액션 | `/search/[id]` | `app/search/[id]/page.tsx` | 서류·타임라인·계획서 진입 |
| 계획서 생성 | `/documents/plan` | `app/documents/plan/page.tsx` | query로 `programId` 등 연계 가능 |
| 심사 점수·품질 | `/evaluate` | `app/evaluate/page.tsx` | 3단계 파이프라인 UI |
| 내 신청 관리 | `/manage` | `app/manage/page.tsx` | 인증 후(Phase 7 연계) |
| 관리자 | `/admin` | `app/admin/page.tsx` | Cron·동기화 — 인증·역할 필수 |

**공고 상세 `[id]` 규칙**: MCP·PRD의 공고 키(`bizinfo:PBLN_…`, `kstartup:177560` 등)를 **URL 안전 문자열로 인코딩**(예: Base64URL 또는 `encodeURIComponent` 단일 세그먼트). Executor는 디코딩 유틸을 `lib/`에 공통 배치.

**API Route 경로**: PRD §6.1 유지 — 프론트 경로와 혼동 금지(`app/api/...`).

### P0.2 `CompanyProfile` 스키마 정본 (wizard → API 공통)

PRD §6.2 요청 예시 필드를 **타입 정본**으로 한다. 구 「7문항」과 달리 API에는 **`region` 포함 총 8 필드**가 명시되어 있으므로 MVP에서도 전원 필수(미입력 시 Zod 검증 차단).

| 필드 | 타입 | 설명 |
|------|------|------|
| `industry` | string | 업종 |
| `workers` | number | 직원 수 |
| `bizAge` | number | 업력(년) |
| `annualRev` | number | 연매출(만원) |
| `creditScore` | number | 신용점수 |
| `taxIssue` | string | 세금 이슈 여부·코드(표준값은 Executor가 상수 테이블로 관리) |
| `region` | string | 지역 |
| `reqAmount` | number | 희망 신청 금액 |

**Supabase `business_profiles`**: PRD §9.2의 컬럼과 1:1 매핑. `certifications` 등 **추가 프로필**은 선택 저장으로 두고 wizard MVP에서는 비노출 가능.

**향후 「10문항」 확장(비목표 / Phase 4 이후 옵션)**: 법인유형·기술기업 인증·R&D 비중 등이 필요해지면 별도 이슈로 필드를 추가하고 API 버전 또는 optional 필드로 확장 — **현 단계 Executor는 스코프 밖**.

---

## High-level Task Breakdown

각 단계는 **한 번에 하나만** Executor가 수행하고, 성공 기준 충족 후 사용자(Planner 전환) 검증을 받는다.

### P0 — 계획 고정 (Planner·사용자)

- [x] **P0.1** 라우트 표 준칙안 작성 — **완료**: 위 「P0 결정 사항」표가 정본 (§4.1 wizard=`page.tsx` 표현 대체).
- [x] **P0.2** 필드 스키마 확정 — **완료**: §6.2 기준 8 필드, 10문항 확장은 후순위 명시.

### Phase 1 — 프로젝트 기반 (Executor)

- [ ] Next.js(App Router)·TS·Tailwind·shadcn 초기화, Vercel 연결, Supabase 프로젝트·Auth 연결  
  - **성공 기준**: 배포 URL에서 빌드 성공, 로그인 플로우 스모크(이메일 매직링크 등 선택 확정)
- [ ] 환경변수 템플릿 `.env.example`(서버 전용 vs `NEXT_PUBLIC_*` 분리)  
  - **성공 기준**: PRD §10과 키 이름 일치

### Phase 2 — gov_support_mcp 이식 (Executor)

- MCP 의존성 제거, `lib/gov-support/` 매핑(PR §3.2), import 경로 수정  
  - **성공 기준**: `npm run build` 성공, 단위 스모크(통합 검색 함수 호출)
- `store.ts` → Supabase 구현체, 인터페이스 동일 유지  
  - **성공 기준**: alert/benefit CRUD 최소 통합 테스트 또는 수동 검증 시나리오 문서화

### Phase 3 — 공고 DB·동기화 (Executor)

- `support_programs` 마이그레이션, `/api/admin/sync`, Cron 시크릿  
  - **성공 기준**: 동기화 1회 실행 후 샘플 N건 조회

### Phase 4 — 검색·자격·wizard 분기 (Executor)

- `/api/search`, `/api/eligibility`, 방식 선택 UI, `/search` 결과  
  - **성공 기준**: 실제 공고 목록 + 자격 상태 표시, PRD §5.1 플로우 E2E 1회

### Phase 5 — 문서 파이프라인 (Executor)

- `/api/documents/*`, `generated_documents` 저장  
  - **성공 기준**: 체크리스트·타임라인·계획서 초안 각 1건 생성·저장

### Phase 6 — 심사 지원 (Executor)

- `/api/evaluate/*`, 3단계 파이프라인 UI  
  - **성공 기준**: 품질 점수 → 수정 권고 → 심사 예측 순서 재현

### Phase 7 — 관리·BM (Executor·후순위)

- manage 라우트·대시보드, 요금제·과금은 PRD Phase 8 범위에서 별도 컷

---

## Project Status Board

- [x] P0 라우트·프로필 스키마 확정 (Planner 완료)
- [x] Git 원격·로컬 클론: `https://github.com/boam79/policy_fund` → `/Users/parkjaemin/Dev/policy_fund`
- [ ] Phase 1 스캐폴딩 (Executor 다음 작업)
- [ ] Phase 2 MCP 이식 (미착수)
- [ ] Phase 3~8 (미착수)

---

## Current Status / Progress Tracking

- **모드**: Planner — P0 완료. 초기 계획·환경 변수 템플릿이 본 레포에 커밋 예정.
- **저장소**: 원격 `https://github.com/boam79/policy_fund` · 로컬 `/Users/parkjaemin/Dev/policy_fund`
- **비밀**: API 키는 **커밋 금지**. 루트 `.env.example`만 버전 관리하고, 실제 값은 각자 `.env.local`에 둠.
- **다음 Executor 단일 마일스톤**: Phase 1 — `create-next-app`(App Router·TS·Tailwind)·플레이스홀더 `/`, `/diagnosis`·로컬 `npm run dev` 성공.

---

## Executor's Feedback or Assistance Requests

- **2026-05-09**: 초기 커밋 `ef7f9bf`를 `origin/main`에 푸시 완료(SSH). 저장소는 기존에 비어 있었음.

---

## API 자격증명 배치 (Planner 메모 — 실제 값은 저장 금지)

사용자가 DM 외 채널로 제공한 키는 **이 파일이나 Git에 절대 넣지 않는다.** 로컬은 `.env.local`, 프로덕션은 Vercel Env에만 설정한다.

| 용도 | 권장 환경변수 (PRD §10 정렬) | 구현 시 참고 |
|------|------------------------------|--------------|
| 기업마당 OpenAPI | `BIZINFO_API_KEY` | 서버 Route Handler에서만 사용 |
| 공공데이터포털(인증키) | `PUBLIC_DATA_SERVICE_KEY` | URL 인코딩된 키를 붙여넣을 경우 `.env`에는 **디코딩된 원문** 또는 포털 안내에 맞는 형식으로 저장(이중 인코딩 주의) |
| 중소벤처24 외부공고 API | `SMES24_API_KEY` 또는 `SMES24_TOKEN` | 엔드포인트는 `extPblancInfo` 등 기관 명세에 맞춤; 쿼리 `strDt`·`endDt`는 `YYYYMMDD`. IP 허용·토큰 유효기간은 기관 정책 확인 |

**보안 사고 대응 (2026-05-09)**: 동일 키가 채팅·로그에 노출된 경우 **즉시 폐기·재발급** 후 Vercel·로컬 env 동시 교체.

---

## Lessons

- **P0 (2026-05-09)**: 프론트 라우트 정본은 PRD §8.1 + 홈(`/`)과 wizard(`/diagnosis`) 분리. API 경로 §6.1과 혼동 금지. `CompanyProfile`은 §6.2 **8필드**가 계약 정본.
- **비밀 관리**: API 키는 채팅에 붙여 넣지 말 것. 스크래치패드·README·커밋 금지. 노출 시 재발급이 원칙.
- 공공 API 추천 MCP는 **나라장터** 등 정책자금과 무관 후보도 섞이므로, **제목·태그로 관련성 필터**하는 후처리가 필요할 수 있음.
- `gov_support_mcp` 통합 검색은 **bizinfo+kstartup만으로도** 스모크 성공 — SMES24는 인프라 준비 후 단계적 활성화가 리스크 최소.
- Next.js 공식 문서상 Route Handler에서 `process.env` 사용 시 **클라이언트 번들에 포함되지 않음**(서버 모듈 한정) — PRD 보안 원칙과 정합.
- 감가상각 MCP는 정책자금 **코어 플로우와 분리**하는 것이 스코프 관리에 유리.

---

## Planner 종료 판정 기준 (전체 프로젝트)

- PRD §5~§9 기능이 스테이징에서 재현되고, §14 고지가 모든 결과 화면에 노출되며, 결제(Phase 8)는 선택 과제로 분리 해도 됨.
