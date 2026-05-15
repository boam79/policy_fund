# PolicyFund AI v2 — 제품 요구사항 정의서 (PRD)

**문서 번호**: PF-WEB-001 v2.0  
**작성일**: 2026-05-09  
**수정일**: 2026-05-11
**UI/UX 제안 이미지**: `ui_ux_design_proposal_for_policyfund_ai.png`  
**관리자 UI/UX 제안 이미지**: `policyfund_ai_v2_admin_dashboard_mockup.png`  
**참고 레퍼런스**: policyfundapp (GitHub Pages MVP 형태)
**이식 대상 엔진**: gov_support_mcp v1.2.3
**개발 성격**: 기존 GitHub Pages 단일페이지 수정이 아닌 신규 웹서비스 개발  
**배포 환경**: Vercel (Next.js 단일 앱) + Supabase
**v2.0 보강 핵심**: Vercel Hobby + Supabase Free 기준 반영, 공공 API 조회 + 최소 캐시 운영모드 확정, 추후 DB 중심 서비스 전환을 위한 원클릭 전환 구조 추가

---

## 목차

1. [서비스 개요](#1-서비스-개요)
2. [참고 레퍼런스 앱 분석 및 설계 반영점](#2-참고-레퍼런스-앱-분석-및-설계-반영점)
3. [gov_support_mcp 이식 전략](#3-gov_support_mcp-이식-전략)
4. [전체 시스템 아키텍처](#4-전체-시스템-아키텍처)
5. [핵심 기능 요구사항](#5-핵심-기능-요구사항)
6. [API Route 설계](#6-api-route-설계)
7. [Gov Support Engine 모듈 명세](#7-gov-support-engine-모듈-명세)
8. [프론트엔드 화면 구성](#8-프론트엔드-화면-구성)
9. [데이터베이스 설계 (Supabase)](#9-데이터베이스-설계-supabase)
10. [환경변수 설계](#10-환경변수-설계)
11. [개발 단계 (Phase)](#11-개발-단계-phase)
12. [비즈니스 모델](#12-비즈니스-모델)
13. [리스크 및 대응](#13-리스크-및-대응)
14. [서비스 운영 필수 페이지](#14-서비스-운영-필수-페이지)
15. [법적 고지 문구](#15-법적-고지-문구)
16. [v1.5 개발 명세 보강](#16-v15-개발-명세-보강)
17. [관리자 페이지 제안](#17-관리자-페이지-제안)
18. [Google Sheets 호환 내보내기 명세](#18-google-sheets-호환-내보내기-명세)
19. [공공 API 연동 명세](#19-공공-api-연동-명세)
20. [비기능 요구사항](#20-비기능-요구사항)
21. [v1.9 개발 착수용 정리](#21-v19-개발-착수용-정리)
22. [v2.0 무료 플랜 운영 기준 및 DB 중심 전환 설계](#22-v20-무료-플랜-운영-기준-및-db-중심-전환-설계)

---

## 1. 서비스 개요

### 1.1 서비스명

**PolicyFund AI v2** (가칭: 정책자금 AI 컨설턴트)

### 1.2 한 줄 정의

> 사용자 정보 기반으로 실제 정부지원사업 공고를 검색·매칭하고, AI가 자격판정·서류체크리스트·타임라인·사업계획서 초안·심사 점수 예측까지 생성해주는 정책자금 특화 웹서비스

### 1.3 신규 개발 원칙

PolicyFund AI v2는 기존 GitHub Pages 단일페이지를 직접 수정·확장하는 프로젝트가 아니다. 기존 단일페이지 MVP는 화면 구성과 문제점을 참고하기 위한 레퍼런스이며, v2는 **Next.js + Vercel + Supabase 기반으로 새롭게 개발하는 독립 웹서비스**다.

| 구분 | 참고 레퍼런스 앱 | 신규 개발 서비스 목표 |
|---|---|---|
| 개발 방식 | GitHub Pages 단일 HTML 참고 | Next.js 기반 신규 웹서비스 개발 |
| 데이터 소스 | LLM 가상 판단 중심 | 실제 공고 API (기업마당·K-Startup·중소벤처24) + DB 캐시 |
| 입력 UX | 7문항 폼 중심 | 자연어 질문 + 조건 확인 카드 + 고급 필터 |
| 자격판정 | 규칙 기반 fallback 참고 | 룰 기반 1차 판정 + LLM 설명 보완 |
| 출력물 | 등급·가능성 수치 참고 | 공고 목록·서류체크리스트·타임라인·계획서 초안 |
| 보안 | API Key 프론트 노출 문제 참고 | 서버 전용 환경변수 (Vercel API Routes) |
| 영속성 | Google Sheets 참고 | Supabase PostgreSQL |

### 1.4 서비스 핵심 구조

```
Next.js 단일 앱 (Vercel)
├── Frontend (App Router)
├── API Routes (서버 전용)
│   └── Gov Support Engine (gov_support_mcp v1.2.3 이식)
│       ├── 모듈1: 통합 탐색 (14개 Tool)
│       ├── 모듈2: 자격 판정
│       ├── 모듈3: 신청 준비 (서류·타임라인·계획서)
│       ├── 모듈4: 수혜 관리
│       └── 모듈5: 심사 지원 (점수 예측·품질 측정)
└── Supabase (Auth·PostgreSQL·Storage)
```

---

## 2. 참고 레퍼런스 앱 분석 및 설계 반영점

### 2.1 참고 레퍼런스 앱 구조 (policyfundapp)

> 이 섹션의 목적은 기존 GitHub Pages 앱을 수정하기 위한 것이 아니라, 신규 서비스 설계 시 참고할 UX 요소와 반드시 피해야 할 기술적 한계를 정리하는 것이다.


- **배포**: GitHub Pages (단일 HTML)
- **입력**: 7문항 wizard (업종·직원수·업력·매출·신용점수·세금이슈·신청금액)
- **처리**: 브라우저에서 Anthropic API 직접 호출 (CORS 차단으로 실질적 미작동)
- **fallback**: 규칙 기반 로컬 로직 (`debtRatio` 하드코딩 200)
- **출력**: 등급(A/B/C)·가능성(%) · 보완항목 · 상담신청 CTA
- **리드 수집**: Google Apps Script → Google Sheets

### 2.2 신규 개발 시 반영할 문제점

| 우선순위 | 문제 | 영향 |
|---|---|---|
| 긴급 | Anthropic API Key 프론트 노출 시도 | 보안 취약 |
| 긴급 | CORS로 LLM 호출 실패 → 전원 fallback 결과 수신 | 서비스 신뢰도 |
| 높음 | `debtRatio` 하드코딩 200 | 결과 차별화 불가 |
| 높음 | 실제 공고 데이터 없음 → 가상 결과 | 사용자 오도 위험 |
| 중간 | GitHub Pages 단일페이지 구조 | 신규 서비스에서는 서버 로직이 가능한 Next.js API Routes 필요 |
| 낮음 | 입력 방식이 폼 중심이라 자연어 상담 UX와 충돌 | 초기 이탈·상담 경험 저하 |

---

## 3. gov_support_mcp 이식 전략

### 3.1 이식 원칙

신규 Next.js 웹서비스 안에 gov_support_mcp의 비즈니스 로직만 재사용한다. MCP 프로토콜 레이어는 웹서비스에 직접 노출하지 않고 제거하며, 필요한 로직 파일만 Next.js `lib/` 디렉토리로 이식한다.

**제거 대상**

```
src/server.ts                      # MCP stdio 진입점 — 전체 삭제
@modelcontextprotocol/sdk          # package.json 의존성 제거
StdioServerTransport               # MCP 전송 레이어
```

**이식 대상 (그대로 재사용)**

```
src/govSupport/clients/            → lib/gov-support/clients/
src/govSupport/core/               → lib/gov-support/core/
src/govSupport/tools/              → lib/gov-support/tools/
src/govSupport/types/              → lib/gov-support/types/
src/govSupport/env.ts              → lib/gov-support/env.ts
src/govSupport/smesQueryEncoding.ts → lib/gov-support/smesEncoding.ts
```

### 3.2 파일 매핑 전체

| gov_support_mcp 원본 | Next.js 이식 경로 | 비고 |
|---|---|---|
| `clients/bizinfoSupport.ts` | `lib/gov-support/clients/bizinfo.ts` | 그대로 |
| `clients/kstartupSupport.ts` | `lib/gov-support/clients/kstartup.ts` | 그대로 |
| `clients/smes24PublicNotice.ts` | `lib/gov-support/clients/smes24.ts` | 그대로 |
| `core/dedup.ts` | `lib/gov-support/core/dedup.ts` | 그대로 |
| `core/cache.ts` | `lib/gov-support/core/cache.ts` | 그대로 |
| `core/store.ts` | `lib/gov-support/core/store.ts` | **인터페이스 유지, 구현체 Supabase로 교체** |
| `smesQueryEncoding.ts` | `lib/gov-support/smesEncoding.ts` | 그대로 |
| `tools/unifiedSearch.ts` | `lib/gov-support/tools/unifiedSearch.ts` | 그대로 |
| `tools/compareByRegion.ts` | `lib/gov-support/tools/compareByRegion.ts` | 그대로 |
| `tools/eligibility.ts` | `lib/gov-support/tools/eligibility.ts` | 그대로 |
| `tools/documentChecklist.ts` | `lib/gov-support/tools/documentChecklist.ts` | 그대로 |
| `tools/timeline.ts` | `lib/gov-support/tools/timeline.ts` | 그대로 |
| `tools/draftTools.ts` | `lib/gov-support/tools/draftTools.ts` | 그대로 |
| `tools/alertProfile.ts` | `lib/gov-support/tools/alertProfile.ts` | 그대로 |
| `tools/benefitHistory.ts` | `lib/gov-support/tools/benefitHistory.ts` | 그대로 |
| `tools/evaluateStartup.ts` | `lib/gov-support/tools/evaluateStartup.ts` | 그대로 |
| `tools/assessQuality.ts` | `lib/gov-support/tools/assessQuality.ts` | 그대로 |
| `types/` | `lib/gov-support/types/` | 그대로 |

### 3.3 store.ts 전환 (JSON → Supabase)

MCP의 `data/*.json` 파일 기반 영속성은 Vercel 서버리스 환경에서 동작하지 않는다.  
`store.ts`의 **인터페이스를 그대로 유지**하고, 구현체만 Supabase 클라이언트로 교체한다.

```typescript
// 기존 MCP (파일 기반)
fs.writeFileSync('data/alertProfiles.json', JSON.stringify(data))

// 이식 후 (Supabase)
await supabase.from('alert_profiles').upsert(data)
```

---

## 4. 전체 시스템 아키텍처

### 4.1 레이어 구조

```
┌─────────────────────────────────────────────────────────┐
│  사용자 브라우저                                           │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  Frontend — Next.js App Router (Vercel)                  │
│  ├ /app/page.tsx          자연어 정책자금 검색창              │
│  ├ /app/search/page.tsx   실제 공고 검색 결과              │
│  └ /app/report/page.tsx   진단 보고서 (등급·공고·CTA)      │
└─────────────────────────────────────────────────────────┘
                          │  HTTP fetch (내부)
                          ▼
┌─────────────────────────────────────────────────────────┐
│  API Routes — /app/api/* (서버 전용, 환경변수 보호)         │
│  ├ /api/search/route.ts      통합검색 + 지역비교           │
│  ├ /api/eligibility/route.ts 자격판정                     │
│  ├ /api/documents/route.ts   서류·타임라인·계획서           │
│  ├ /api/evaluate/route.ts    심사점수·품질측정              │
│  └ /api/manage/route.ts      알림·수혜이력 관리            │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  Gov Support Engine — lib/gov-support/                   │
│  (gov_support_mcp v1.2.3 이식, MCP 프로토콜 제거)          │
│                                                         │
│  Core 레이어                                              │
│  ├ core/dedup.ts       Jaccard 중복 제거 엔진             │
│  ├ core/cache.ts       인메모리 TTL 캐시                  │
│  ├ core/store.ts       Supabase 영속성 (JSON→DB 교체)     │
│  └ smesEncoding.ts     이중 인코딩 방지 유틸               │
│                                                         │
│  모듈1: 통합 탐색                                         │
│  ├ unifiedSearch.ts    3소스 병렬 통합 검색 + dedup        │
│  ├ compareByRegion.ts  최대 8개 지역 공고 현황 비교         │
│  ├ clients/bizinfo.ts  기업마당 API 클라이언트             │
│  ├ clients/kstartup.ts K-Startup API 클라이언트           │
│  └ clients/smes24.ts   중소벤처24 API 클라이언트           │
│                                                         │
│  모듈2: 자격 판정                                         │
│  └ eligibility.ts      공고 텍스트 + 회사 프로파일 매칭      │
│                                                         │
│  모듈3: 신청 준비                                         │
│  ├ documentChecklist.ts 표준 서류 DB(15종) 매칭            │
│  ├ timeline.ts          마감일 역산 9단계 타임라인           │
│  └ draftTools.ts        사업계획서 초안 (gov/psst 템플릿)   │
│                                                         │
│  모듈4: 수혜 관리                                         │
│  ├ alertProfile.ts      알림 프로파일 CRUD                │
│  ├ benefitHistory.ts    수혜 이력 + 지출 + 정산 보고서      │
│  └ (settlementReport)   draftTools.ts 내 포함             │
│                                                         │
│  모듈5: 심사 지원                                         │
│  ├ evaluateStartup.ts   5대 평가축 루브릭 (100점 + 가점)    │
│  └ assessQuality.ts     공식 PSST 품질 측정 (30/30/20/20)  │
└─────────────────────────────────────────────────────────┘
                    │                    │
                    ▼                    ▼
┌─────────────────────┐    ┌────────────────────────────┐
│  외부 공공 API        │    │  LLM API (서버 전용)         │
│  · 기업마당 ✅        │    │  · Claude API (Anthropic)  │
│  · K-Startup ✅      │    │  · lib/llm/claude.ts       │
│  · 중소벤처24 ⚠️     │    │  · lib/llm/promptBuilder.ts│
│    (서버 IP 등록 후)  │    └────────────────────────────┘
└─────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  Supabase                                                │
│  ├ Auth             사용자 인증                           │
│  ├ PostgreSQL       공고·진단·문서·이력 데이터             │
│  ├ Storage          생성 문서 파일 (PDF·Word)             │
│  └ (JSON 이식)      alertProfiles·benefitHistory 등       │
└─────────────────────────────────────────────────────────┘
```

### 4.2 배포 구조

```
Vercel
├── Next.js Frontend (SSR/SSG)
├── Next.js API Routes (서버리스 함수)
├── 환경변수 (서버 전용, NEXT_PUBLIC_ 사용 금지)
└── Cron Job: 공고 동기화 (Vercel Cron 또는 Supabase Edge Function)

Supabase
├── Auth (이메일·소셜 로그인)
├── PostgreSQL (RLS 적용)
├── Storage (생성 문서)
└── Edge Functions (공고 주기적 동기화)
```

---

## 5. 핵심 기능 요구사항

### 5.1 자연어 기반 정책자금 탐색 [핵심 변경]

신규 서비스의 기본 입력 방식은 7문항 wizard가 아니라 **자연어 질문**이다. 사용자는 처음부터 조건을 모두 선택하지 않고, 본인의 상황과 목적을 문장으로 입력한다.

예시:

```text
경기도에서 제조업을 3년째 하고 있고 직원은 5명입니다.
운영자금으로 받을 수 있는 정책자금이나 지원사업을 찾아주세요.
```

시스템은 사용자의 자연어 질문에서 검색 조건을 자동 추출한다.

```json
{
  "region": "경기도",
  "industry": "제조업",
  "businessAge": 3,
  "employeeCount": 5,
  "purpose": "운영자금",
  "intent": "policy_fund_search"
}
```

LLM은 **검색 결과를 생성하지 않는다.** LLM의 역할은 자연어 문장에서 지역, 업종, 업력, 직원 수, 매출, 세금 이슈, 신청 목적 등 검색 조건을 추출하고 부족한 조건을 질문하는 데 한정한다. 실제 검색은 반드시 **공공 API + DB 검색 + 필터링**으로 수행한다.

### 5.2 조건 확인 카드 + 부족 정보 보완

자연어에서 추출한 조건은 검색 전에 사용자에게 카드 형태로 보여준다. 사용자는 자동 추출된 값을 확인·수정할 수 있다.

```text
[추출된 조건]
지역: 경기도
업종: 제조업
업력: 3년
직원 수: 5명
지원 목적: 운영자금
연매출: 미입력
세금 체납 여부: 미입력
신청 희망 금액: 미입력

[부족한 정보]
연매출, 세금 체납 여부, 신청 희망 금액을 입력하면 더 정확한 판정이 가능합니다.
모르면 '모름'으로 진행할 수 있습니다.
```

참고 레퍼런스 앱의 7문항 wizard 방식은 그대로 복제하지 않고, 신규 서비스에서는 다음 용도의 보조 UX로 재해석한다.

| 기존 역할 | 변경 후 역할 |
|---|---|
| 메인 입력 방식 | 보조 입력·고급 필터 |
| 진단 시작 전 필수 설문 | 자연어 추출값 확인·수정 카드 |
| 모든 사용자가 반드시 입력 | 부족한 조건이 있을 때만 입력 |
| 빠른 AI 진단 중심 | 실제 공고 검색 정확도 보완 |

### 5.3 진단/검색 방식 선택

자연어 입력과 조건 확인 후 사용자에게 두 가지 방식을 제시한다.

| 방식 | 설명 | 소요 시간 | 데이터 |
|---|---|---|---|
| 빠른 AI 진단 | 실제 공고 검색 없이 입력 조건 기반으로 가능성을 빠르게 추정 | 3~5초 | 추정 |
| 실제 공고 맞춤 검색 | 기업마당·K-Startup·중소벤처24 등 실제 공고 데이터 검색 | 10~20초 | 실제 공고 |

사용자에게 두 방식의 차이를 명확히 고지한다. “빠른 AI 진단”은 실제 공고 매칭 결과가 아니며, “실제 공고 맞춤 검색”만 공공 API/DB 기반 결과로 표시한다.

### 5.4 통합 탐색 (모듈1)

**`searchGovernmentSupport`**
- 기업마당·K-Startup·중소벤처24 병렬 호출
- Supabase `support_programs` 캐시 DB 검색
- Jaccard dedup으로 중복 제거
- 키워드·분야·지역·소스·지원 목적 필터
- `maxPerSource` 기본 20건/소스

**`compareByRegion`**
- 최대 8개 지역 공고 수·분야 분포 비교표


### 5.4.1 메인 AI 추천 지원사업 배너 [UI/UX 반영]

홈 화면에는 사용자의 자연어 검색 전에도 **AI 추천 지원사업 배너**를 노출한다. 단, 이 배너는 LLM이 임의로 생성한 공고가 아니라, 실제 공공 API 또는 Supabase `support_programs` 캐시 DB에서 가져온 공고를 기반으로 구성해야 한다.

#### 목적

- 사용자가 질문을 입력하기 전에도 서비스의 핵심 가치를 즉시 이해하게 한다.
- 현재 모집 중이거나 마감이 임박한 지원사업을 보여줘 탐색 동기를 높인다.
- 자연어 검색창 아래에 실제 데이터 기반 추천 영역을 배치해 신뢰감을 높인다.

#### 배너 데이터 원칙

| 항목 | 원칙 |
|---|---|
| 데이터 출처 | 기업마당·K-Startup·중소벤처24 API 또는 `support_programs` DB |
| 생성 방식 | LLM 생성 금지, 실제 공고 데이터만 사용 |
| LLM 역할 | 배너 문구 요약·추천 사유 설명 보조 가능 |
| 필수 표시 | 공고명, 기관, 지원유형, 신청마감일, 지원금/지원내용, 상태 배지 |
| 추천 기준 | 마감 임박, 신규 등록, 인기 조회, 사용자 조건 매칭, 지역/업종 매칭 |
| 데이터 없음 | 샘플 공고 생성 금지, “현재 표시할 추천 공고가 없습니다” 또는 전체 인기 공고 표시 |

#### 추천 배너 유형

```text
1. 오늘의 추천 지원사업
2. 마감 임박 지원사업
3. 신규 등록 지원사업
4. 내 조건과 유사한 기업이 볼 만한 공고
5. 정책자금/창업/R&D/고용지원 카테고리별 추천
```

#### 공공 API 데이터 저장 정책 [v1.8 반영]

메인에 노출되는 지원사업은 공공 API에서 가져온 실제 공고를 기반으로 한다. 단, 홈 화면 접속 시마다 공공 API를 실시간 호출하지 않고, 주기적으로 수집한 데이터를 Supabase에 정제 저장한 뒤 메인 배너·검색·자격판정·추천에 사용한다.

```text
공공 API
→ 주기적 수집 / 수동 동기화
→ Supabase support_programs 저장
→ 중복 제거 / 마감 상태 계산 / 필드 정규화
→ 메인 추천 배너·검색 결과·자격판정에 사용
```

##### 실시간 직접 호출을 기본값으로 사용하지 않는 이유

| 항목 | 실시간 공공 API 직접 호출 시 문제 | DB 저장 후 조회 방식의 장점 |
|---|---|---|
| 응답 속도 | 홈 접속마다 외부 API 응답을 기다림 | DB 조회로 빠른 화면 표시 |
| 안정성 | 공공 API 장애·지연이 사용자 화면에 직접 영향 | 마지막 정상 동기화 데이터를 계속 표시 가능 |
| 호출량 | 사용자 방문 수만큼 API 호출 증가 | 정해진 주기만큼만 호출 |
| 추천 계산 | 매번 중복 제거·정렬·점수 계산 필요 | 미리 계산된 추천 점수 사용 가능 |
| 노출 제어 | 오류 공고·마감 공고 제어 어려움 | 상태값으로 노출/숨김 제어 가능 |

##### 저장 범위

DB에는 공공 API 전체 원문을 무제한 저장하지 않는다. 서비스 운영에 필요한 공고만 정제해 저장한다.

| 구분 | 저장 여부 | 설명 |
|---|---|---|
| 현재 모집 중 공고 | 저장 | 검색·추천·자격판정 기본 대상 |
| 마감 임박 공고 | 저장 | 홈 배너와 알림 후보 |
| 최근 마감 공고 | 제한 저장 | 기본 검색에서는 제외, 비교·기록용으로 일정 기간 보관 |
| 오래된 마감 공고 | archive 또는 삭제 | 기본 사용자 화면에서는 제외 |
| 원문 전체 | 선택 저장 | 필요 시에만 저장. 기본은 핵심 필드 중심 저장 |
| 첨부파일 원본 | 기본 저장 안 함 | URL만 보관하고, 필요 시 별도 수집 검토 |
| LLM 요약문 | 선택 저장 | 자주 노출되는 공고 또는 사용자 요청 공고 중심으로 저장 |

##### 기본 보관 정책

| 데이터 | 기본 정책 |
|---|---|
| 모집 중 공고 | active 상태로 유지 |
| 마감 후 90일 이내 공고 | closed 상태로 보관, 기본 검색에서는 제외 |
| 마감 후 90일 초과 공고 | archive 상태 전환 |
| 마감 후 1년 초과 공고 | 운영 정책에 따라 삭제 또는 archive 테이블 이동 |
| 오류 공고 | error 상태로 보관하고 관리자 QA 대상 |
| 중복 의심 공고 | duplicate_suspected 상태로 표시 |

##### 메인 추천 배너 데이터 원칙

메인 배너는 `support_programs.status = active`이고 `visibility_status = visible`인 공고만 사용한다. 공공 API에서 새로 들어온 공고라도 아래 조건에 해당하면 자동 배너 후보에서 제외한다.

```text
- 마감일이 지났거나 마감일이 없는 공고
- 원문 URL이 없는 공고
- 제목/기관명/신청기간 필수값이 누락된 공고
- duplicate_suspected 또는 error 상태 공고
- 관리자가 추천 제외 처리한 공고
```

##### 관리자 공고 목록의 목적 변경

관리자 페이지의 공고 목록은 공고를 사람이 전부 등록·수정하기 위한 CRUD 화면이 아니다. 목적은 **공공 API에서 수집된 공고 데이터의 품질관리(QA), 노출 상태 확인, 추천 배너 제어, 동기화 오류 대응**이다.

#### 홈 배너 표시 예시

```text
[AI 추천 지원사업]
사용자 조건 또는 현재 공개 공고 데이터를 기준으로 추천합니다.

카드 1: 2026년 중소기업 정책자금 융자계획
- 지원유형: 정책자금
- 신청마감: D-12
- 상태: 신청 가능
- 추천 사유: 제조업·운영자금 키워드와 연관

카드 2: 창업기업 사업화 지원사업
- 지원유형: 창업지원
- 신청마감: D-5
- 상태: 검토 필요
```

#### 개인화 전/후 동작

| 상태 | 배너 로직 |
|---|---|
| 비로그인·조건 없음 | 최신 공고, 마감 임박, 조회수 높은 공고 중심 |
| 자연어 조건 추출 후 | 지역·업종·업력·지원목적과 매칭되는 공고 중심 |
| 로그인·프로필 있음 | 저장된 `business_profiles` 기준 개인화 추천 |
| 검색 이력 있음 | 최근 검색 조건과 관심 공고 기반 추천 |

### 5.5 자격 판정 (모듈2)

**`checkEligibility`**

자격판정은 **룰 기반 1차 판정 + LLM 설명 보완** 구조로 수행한다.

1차 판정:
- 공고 원문 또는 `parsed_conditions`의 구조화 조건과 사용자 프로필을 비교
- 지역, 업종, 업력, 직원 수, 매출, 세금 체납, 중복 수혜, 필수 서류 조건을 우선 검증
- 명확한 불일치 조건은 LLM 없이 판정

LLM 보완:
- 애매한 문구 해석
- 판정 근거 설명
- 사용자가 이해하기 쉬운 보완 방향 작성
- 단, 없는 조건을 생성하지 않도록 공고 원문 근거를 함께 표시

판정 결과:
- `likely_eligible` — 신청 가능
- `review_needed` — 검토 필요
- `likely_ineligible` — 해당 없음

분석 기준:

```text
업종 조건 / 지역 조건 / 업력 조건
매출 기준 / 직원 수 기준
세금 체납 여부 / 중복 수혜 여부
필수 서류 준비 가능성
```

### 5.6 신청 준비 (모듈3)

**`generateDocumentChecklist`**
- 공고 텍스트에서 서류 추출
- 표준 서류 DB(15종) 매칭
- 발급기관·소요일수·수집 기한 포함

**`buildApplicationTimeline`**
- 마감일 역산 9단계 타임라인
- 서류수집 → 계획서 → 내부검토 → 제출 → 심사결과 → 협약

**`draftBusinessPlan`**

사업계획서 초안 생성은 LLM 중심 기능이다. 단, 공고명, 지원 목적, 평가 항목, 사용자 프로필, 자격판정 결과를 입력값으로 제한하여 공고와 무관한 내용이 생성되지 않도록 한다.

| 템플릿 | 대상 | 구조 |
|---|---|---|
| `gov` (기본) | 정부보조금 신청 | 6섹션 공문서 (기업개요·목적·기술·일정·예산·기대효과) |
| `psst` | 창업패키지·VC 심사 | Problem·Solution·Scale-up·Team 4축 12소섹션 |

### 5.7 수혜 관리 (모듈4)

**`manageAlertProfile`**
- 알림 조건 CRUD (키워드·분야·지역·대상)

**`manageBenefitHistory`**
- 수혜 이력 CRUD
- 지출 추가·마일스톤 기록
- 집행률·잔액 자동 계산

**`draftSettlementReport`**
- 수혜 이력 기반 정산 보고서 초안
- 비목별 집행 현황·첨부 서류 목록

### 5.8 심사 지원 (모듈5)

**`evaluateStartupApplication`**

심사 점수 예측은 **루브릭 기반 점수화 + LLM 코멘트** 구조로 수행한다. 점수는 사전에 정의된 평가표와 체크리스트 기반으로 계산하고, LLM은 감점 이유·보완 방향·예상 질문 작성에 사용한다.

| 평가축 | 배점 | 주요 항목 |
|---|---|---|
| 기술성·혁신성 | 20점 | 기술 원리(6)·차별화(7)·특허IP(4)·고객검증(3) |
| 사업성 | 30점 | 수익모델(8)·3개년매출(8)·월별일정(7)·집행계획(7) |
| 시장성 | 25점 | TAM/SAM/SOM(9)·출처신뢰도(7)·경쟁분석(5)·GTM(4) |
| 창업자·팀 역량 | 25점 | 도메인경력(10)·연관성(8)·팀완성도(7) |
| 정책부합·사회적 가치 | 가점 5점 | 사회적가치(2)·정책연계(2)·고용창출(1) |

**총 100점 + 가점 5점**

**`assessBusinessPlanQuality`**

공식 PSST 배점표 기반 품질 측정 (중기부 공고문·창업진흥원 세부관리기준):

| 항목 | 배점 |
|---|---|
| 문제인식 (Problem) | 30점 |
| 실현가능성 (Solution) | 30점 |
| 성장전략 (Scale-up) | 20점 |
| 팀구성 (Team) | 20점 |

출력:
- 항목별 점수·충족도
- 즉시 수정 항목
- 발표 예상 질문
- 제출 판정 (✅ 가능 / ⚠️ 보완 후 / ❌ 전면 보강)

### 5.9 3단계 심사 준비 파이프라인

```text
① draftBusinessPlan (template: psst or gov)
        ↓ 초안 생성
② assessBusinessPlanQuality
        ↓ 품질 점수 + 즉시 수정 항목 + 예상 질문
   사용자 문서 보완
        ↓
③ evaluateStartupApplication
        ↓ 심사 점수 예측 + 합격 가능성
   상담 신청 CTA
```

---

## 6. API Route 설계

### 6.1 라우트 목록

| Route | Method | 연결 Tool | 설명 |
|---|---|---|---|
| `/api/query/parse` | POST | LLM 조건 추출 | 자연어 질문에서 검색 조건 추출 |
| `/api/search` | POST | `searchGovernmentSupport`, `compareByRegion` | 통합 공고 검색 |
| `/api/eligibility` | POST | `checkEligibility` | 공고 자격 판정 |
| `/api/documents/checklist` | POST | `generateDocumentChecklist` | 서류 체크리스트 |
| `/api/documents/timeline` | POST | `buildApplicationTimeline` | 신청 타임라인 |
| `/api/documents/plan` | POST | `draftBusinessPlan` | 사업계획서 초안 |
| `/api/documents/settlement` | POST | `draftSettlementReport` | 정산 보고서 |
| `/api/evaluate/startup` | POST | `evaluateStartupApplication` | 심사 점수 예측 |
| `/api/evaluate/quality` | POST | `assessBusinessPlanQuality` | 계획서 품질 측정 |
| `/api/manage/alert` | GET/POST/PUT/DELETE | `manageAlertProfile` | 알림 프로파일 CRUD |
| `/api/manage/benefit` | GET/POST/PUT | `manageBenefitHistory` | 수혜 이력 관리 |
| `/api/admin/sync` | POST | — | 공고 동기화 (Cron) |
| `/api/admin/dashboard` | GET | 내부 Admin API | 관리자 KPI·패널 데이터 조회 |
| `/api/admin/programs` | GET | 내부 Admin API | 관리자 공고 목록 조회·필터링 |
| `/api/admin/programs/[id]` | GET/PATCH | 내부 Admin API | 관리자 공고 상세 조회·상태/파싱값 수정 |
| `/api/admin/programs/sync` | POST | 내부 Admin API + 공공 API | 관리자가 수동으로 공공 API 동기화 실행 |
| `/api/admin/recommendations/home-slots` | GET/PATCH | 내부 Admin API | 홈 추천 배너 슬롯 조회·수정 |
| `/api/admin/inquiries` | GET/PATCH | 내부 Admin API | 문의 목록 조회·처리 상태 변경 |
| `/api/admin/feedback` | GET/PATCH | 내부 Admin API | 피드백 조회·처리 상태 변경 |
| `/api/admin/content/faqs` | GET/POST/PATCH/DELETE | 내부 Admin API | FAQ 콘텐츠 관리 |
| `/api/admin/content/guide` | GET/POST/PATCH/DELETE | 내부 Admin API | 이용안내 콘텐츠 관리 |
| `/api/admin/system-alerts` | GET/PATCH | 내부 Admin API | 시스템 알림 조회·확인·해결 처리 |
| `/api/admin/activity-logs` | GET | 내부 Admin API | 관리자 작업 이력 조회 |
| `/api/export/csv` | POST | 내부 Export API | Google Sheets 호환 CSV 생성 |
| `/api/export/xlsx` | POST | 내부 Export API | Google Sheets 호환 XLSX 생성 |
| `/api/home/recommendations` | GET/POST | `getHomeRecommendations` | 메인 AI 추천 지원사업 배너 데이터 조회 |
| `/api/programs/trending` | GET | `getTrendingPrograms` | 마감 임박·신규·인기 공고 조회 |
| `/api/contact` | POST | — | 고객 문의·제휴 문의·오류 신고 접수 |
| `/api/feedback` | POST | — | 검색 결과·추천 결과 피드백 수집 |

### 6.2 공통 요청/응답 구조

```typescript
// 요청 (POST 공통)
{
  userQuery?: string          // 사용자의 자연어 질문
  extractedConditions?: {     // LLM이 자연어에서 추출한 조건
    intent?: string           // policy_fund_search | business_plan | eligibility_check 등
    keywords?: string[]       // 검색 키워드
    purpose?: string          // 운영자금, 창업지원, R&D, 고용지원 등
    missingFields?: string[]  // 추가 확인이 필요한 필드
    confidence?: number       // 조건 추출 신뢰도
  }
  companyProfile: {
    industry?: string         // 업종
    workers?: number          // 직원 수
    bizAge?: number           // 업력 (년)
    annualRev?: number        // 연매출 (만원)
    creditScore?: number      // 신용점수
    taxIssue?: string         // 세금이슈 여부
    region?: string           // 지역
    reqAmount?: number        // 신청 금액
  }
  programText?: string        // 공고 원문 (자격판정·서류 생성 시)
  programId?: string          // 선택한 공고 ID
  deadline?: string           // 마감일 (타임라인 생성 시)
  template?: 'gov' | 'psst'   // 계획서 템플릿
}

// 응답 공통
{
  success: boolean
  data: any
  error?: string
  cached?: boolean            // 캐시 응답 여부
}
```


### 6.3 메인 추천 배너 API

#### `/api/home/recommendations`

홈 화면의 AI 추천 지원사업 배너에 사용할 공고 목록을 반환한다.

```typescript
// GET: 비로그인 또는 기본 추천
/api/home/recommendations?mode=deadline&limit=6

// POST: 자연어 조건 또는 로그인 사용자 프로필 기반 추천
{
  "extractedConditions": {
    "region": "경기도",
    "industry": "제조업",
    "businessAge": 3,
    "purpose": "운영자금"
  },
  "userId": "optional",
  "limit": 6
}
```

응답:

```typescript
{
  "success": true,
  "data": [
    {
      "programId": "uuid",
      "title": "지원사업명",
      "organization": "소관기관",
      "supportType": "정책자금",
      "supportAmount": "최대 5천만원",
      "deadline": "2026-06-15",
      "dDay": 12,
      "statusBadge": "신청 가능",
      "matchScore": 82,
      "recommendReason": "지역·업종·지원목적이 유사합니다.",
      "source": "bizinfo"
    }
  ],
  "cached": true
}
```

#### 추천 점수 산정 기준

```text
recommend_score =
  지역 일치 점수        20
+ 업종/분야 일치 점수   20
+ 지원목적 일치 점수     20
+ 업력/대상조건 일치     15
+ 마감 임박 가중치       15
+ 신규 등록/인기 가중치  10
```

LLM은 `recommendReason` 문구를 자연스럽게 다듬는 용도로만 사용한다. `matchScore`, `statusBadge`, 추천 대상 공고 선정은 DB 필터링과 룰 기반 점수화로 처리한다.

---

## 7. Gov Support Engine 모듈 명세

### 7.1 디렉토리 구조

```
lib/
└── gov-support/
    ├── clients/
    │   ├── bizinfo.ts          # 기업마당 API 클라이언트
    │   ├── kstartup.ts         # K-Startup API 클라이언트
    │   └── smes24.ts           # 중소벤처24 API 클라이언트
    ├── core/
    │   ├── cache.ts            # 인메모리 TTL 캐시
    │   ├── dedup.ts            # Jaccard 중복 제거 (≥0.75)
    │   └── store.ts            # Supabase 영속성 (JSON 인터페이스 유지)
    ├── tools/
    │   ├── unifiedSearch.ts    # searchGovernmentSupport
    │   ├── compareByRegion.ts  # compareByRegion
    │   ├── eligibility.ts      # checkEligibility
    │   ├── documentChecklist.ts # generateDocumentChecklist
    │   ├── timeline.ts         # buildApplicationTimeline
    │   ├── draftTools.ts       # draftBusinessPlan + draftSettlementReport
    │   ├── alertProfile.ts     # manageAlertProfile
    │   ├── benefitHistory.ts   # manageBenefitHistory
    │   ├── evaluateStartup.ts  # evaluateStartupApplication
    │   └── assessQuality.ts    # assessBusinessPlanQuality
    ├── types/
    │   ├── bizinfo.ts
    │   ├── kstartup.ts
    │   ├── smes24.ts
    │   └── common.ts           # Announcement, CompanyProfile 등
    ├── env.ts                  # 환경변수 로더
    └── smesEncoding.ts         # 이중 인코딩 방지 유틸

lib/
└── llm/
    ├── claude.ts               # Claude API 클라이언트 (서버 전용)
    ├── promptBuilder.ts        # 프롬프트 생성
    └── documentGenerator.ts   # 문서 출력 (Markdown → PDF/Word)

lib/
└── supabase/
    ├── client.ts               # 클라이언트 사이드 Supabase
    └── admin.ts                # 서버 사이드 Supabase (SERVICE_ROLE_KEY)
```

### 7.2 dedup.ts 중복 제거 로직

```
1단계: source + external_id 완전 일치 제거
2단계: title + agency 완전 일치 제거
3단계: Jaccard 유사도 ≥ 0.75 퍼지 중복 제거
```

### 7.3 cache.ts TTL 정책

```
공고 검색 결과:   TTL 1시간
자격판정 결과:    TTL 30분
서류 체크리스트:  TTL 24시간
```

---

## 8. 프론트엔드 화면 구성

### 8.1 화면 목록

| 화면 | 경로 | 설명 |
|---|---|---|
| 홈 | `/` | 자연어 정책자금 검색창 + AI 추천 지원사업 배너 + 서비스 소개 |
| 조건 확인 | `/diagnosis` | 자연어 추출 조건 확인·수정 + 부족 정보 보완 |
| 빠른 AI 진단 결과 | `/report/quick` | 입력 조건 기반 추정 진단 |
| 실제 공고 검색 결과 | `/search` | 매칭 공고 목록 + 자격판정 |
| 공고 상세 | `/search/[id]` | 공고 상세 + 서류·타임라인 |
| 계획서 생성 | `/documents/plan` | gov/psst 선택 + 생성 + 편집 |
| 심사 점수 예측 | `/evaluate` | 루브릭 점수 + LLM 보완 코멘트 |
| 내 신청 관리 | `/manage` | 관심 공고·수혜 이력·알림 |
| 관리자 | `/admin` | 공고 동기화·로그·결제 |
| 서비스 소개 | `/about` | 서비스 목적·차별점·데이터 기반 설명 |
| 이용안내 | `/guide` | 자연어 검색·조건 확인·자격판정·문서 생성 방법 안내 |
| 요금제 | `/pricing` | 무료/유료 플랜, 건당 결제, B2B 플랜 안내 |
| 이용약관 | `/terms` | 서비스 이용 조건, 유료 기능, 책임 범위 |
| 개인정보처리방침 | `/privacy` | 수집 항목, 이용 목적, 보관 기간, 제3자 제공 여부 |
| 법적 고지 | `/disclaimer` | 추천·자격판정·문서 생성 결과의 한계와 면책 |
| 고객센터/문의 | `/contact` | 문의하기, 제휴 문의, 오류 신고 |
| 자주 묻는 질문 | `/faq` | 공고 데이터, 자격판정, 결제, 문서 생성 관련 FAQ |

### 8.2 자연어 기반 탐색 흐름 (핵심 변경)

```text
홈 화면
    ↓ "어떤 지원사업을 찾고 계신가요?"
자연어 질문 입력
    예: "경기도 제조업 3년차인데 운영자금 지원사업 찾아줘"
    ↓
/api/query/parse 호출
    ↓
AI가 조건 추출
    - 지역: 경기도
    - 업종: 제조업
    - 업력: 3년
    - 목적: 운영자금
    ↓
[조건 확인 카드]
    ├── 추출된 조건 확인·수정
    ├── 부족 정보만 추가 입력
    └── 고급 필터 열기 (7문항 wizard를 참고한 보조 입력 역할)
    ↓
[방식 선택]
    ├── "빠른 AI 진단 (3초)"
    │       ↓
    │   입력 조건 기반 추정 진단 → 참고 레퍼런스와 유사한 요약 보고서 UI
    │
    └── "실제 공고 맞춤 검색 (10~20초)"
            ↓
        Gov Support Engine 호출
            ↓
        공공 API + support_programs DB 검색
            ↓
        실제 공고 목록 + 자격판정 결과
            ↓
        공고 선택 → 서류·타임라인·계획서
            ↓
        심사 점수 예측 → 상담 신청 CTA
```

### 8.2.1 조건 확인 카드 UI 원칙

- 자연어에서 추출한 조건은 검색 전 반드시 사용자에게 보여준다.
- 사용자는 추출값을 직접 수정할 수 있다.
- 필수 조건이 부족해도 “모름”으로 검색을 진행할 수 있다.
- 부족한 조건은 검색 정확도와 자격판정 신뢰도에 영향을 준다는 안내를 표시한다.
- 7문항 입력 방식은 참고 레퍼런스의 UX를 일부 차용하되, 필수 단계가 아니라 “고급 필터” 또는 “정확도 높이기” 기능으로 제공한다.


### 8.2.2 홈 화면 UI/UX 제안 반영

제안 이미지 기준으로 홈 화면은 **검색 중심 SaaS형 랜딩 + 공공서비스 신뢰형 카드 UI**를 결합한다.

#### 홈 화면 정보 구조

```text
[상단 네비게이션]
서비스 소개 | 지원사업 찾기 | 사업계획서 | 이용안내 | 로그인

[Hero]
PolicyFund AI v2
정부지원사업을 찾고, 자격을 확인하고, 사업계획서 초안까지 준비하는 AI 컨설턴트

[자연어 검색 입력]
예: 경기도 제조업 3년차인데 받을 수 있는 정책자금 찾아줘

[조건 추출 칩]
지역: 경기도 | 업종: 제조업 | 업력: 3년 | 직원수: 5명 | 매출: 2억

[AI 추천 지원사업 배너]
실제 공공 데이터 기반 추천 카드 3~6개

[4단계 이용 흐름]
질문 입력 → 조건 추출 → 공고 매칭 → 서류/계획서 생성

[신뢰 요소]
실제 공공 데이터 | 자격판정 근거 표시 | 문서 생성 지원 | 개인정보 보호

[CTA]
내 조건으로 지원사업 찾기 / 샘플 결과 보기

[Footer]
서비스 소개 | 이용안내 | 이용약관 | 개인정보처리방침 | 법적 고지 | 고객센터
```

#### 디자인 원칙

| 요소 | 방향 |
|---|---|
| 톤앤매너 | 신뢰감 있는 블루·네이비 계열 + 밝은 배경 |
| 레이아웃 | 검색창을 최상단 핵심 액션으로 배치 |
| 카드 UI | 공고명, 지원금, 마감일, 상태 배지가 한눈에 보이게 구성 |
| AI 느낌 | 과도한 챗봇 UI보다 “AI가 정리해주는 공공데이터 서비스” 느낌 |
| 모바일 | 검색창 → 조건칩 → 추천카드 세로 스택 구조 |
| CTA | “신청 가능성 보기”, “서류 체크리스트”, “계획서 초안 만들기”로 명확화 |

### 8.2.3 AI 추천 지원사업 배너 UI

```text
┌──────────────────────────────────────────────┐
│ AI 추천 지원사업                              │
│ 실제 공공 데이터와 조건 매칭 결과를 기반으로 추천합니다. │
├──────────────────────────────────────────────┤
│ [카드 1] 신청 가능                             │
│ 2026년 중소기업 정책자금 지원                  │
│ 최대 5천만원 · D-12 · 정책자금                  │
│ 추천사유: 제조업·운영자금 조건과 일치             │
│ [자세히 보기] [자격판정]                         │
├──────────────────────────────────────────────┤
│ [카드 2] 검토 필요                             │
│ 창업기업 사업화 지원사업                        │
│ 최대 3천만원 · D-5 · 창업지원                    │
│ 추천사유: 업력 조건은 적합하나 지역 확인 필요       │
│ [자세히 보기] [자격판정]                         │
└──────────────────────────────────────────────┘
```

#### 배너 데이터 로딩 흐름

```text
홈 진입
  ↓
/api/home/recommendations 호출
  ↓
1차: Supabase support_programs에서 최신/마감임박 공고 조회
  ↓
2차: 로그인 또는 조건 추출값이 있으면 개인화 점수 계산
  ↓
3차: recommendation_score 상위 3~6개 반환
  ↓
프론트 카드 렌더링
```

### 8.2.4 참고할 UI/UX 사이트 방향

| 레퍼런스 | 참고 포인트 | PolicyFund AI v2 반영 방식 |
|---|---|---|
| K-Startup 창업지원포털 | 창업단계·관심분야 기반 탐색, 공고 일정 안내 | 조건칩, 단계형 탐색, 일정 중심 카드에 반영 |
| 기업마당 | 지원분야·신청기간·소관부처 중심 공고 목록 | 추천 카드의 정보 구조와 필터링 기준에 반영 |
| Grants.gov | 검색 중심의 공공 보조금 탐색 구조 | 자연어 검색창과 필터 사이드바 구조에 반영 |
| Instrumentl | Grant discovery → writing → management의 SaaS 흐름 | 공고 탐색 이후 사업계획서·관리 기능 확장 흐름에 반영 |

### 8.3 기술 스택 (프론트엔드)

| 항목 | 기술 |
|---|---|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| UI Components | shadcn/ui |
| Form | React Hook Form + Zod |
| State | Zustand 또는 TanStack Query |
| Deploy | Vercel |

---

## 9. 데이터베이스 설계 (Supabase)

### 9.1 users

```sql
users
- id              uuid primary key (Supabase Auth 연동)
- email           text
- name            text
- role            text  -- 'user' | 'consultant' | 'admin'
- created_at      timestamp
- updated_at      timestamp
```

### 9.2 business_profiles

```sql
business_profiles
- id                    uuid primary key
- user_id               uuid references users(id)
- industry              text
- region                text
- employee_count        int
- business_age_years    numeric
- annual_revenue_krw    numeric
- credit_score          int null
- tax_issue_status      text null -- none | exists | unknown
- desired_amount_krw    numeric null
- certifications        jsonb
- created_at            timestamp
- updated_at            timestamp
```

### 9.3 support_programs (공고 캐시)

```sql
support_programs
- id                  uuid primary key
- source              text  -- 'bizinfo' | 'kstartup' | 'smes24'
- external_id         text
- title               text
- organization        text
- region              text
- industry            text
- support_type        text
- support_amount      text
- application_start_date date
- application_end_date   date
- status              text  -- active | closing_soon | closed | archived | hidden | error | duplicate_suspected | deleted_candidate
- visibility_status   text  -- visible | hidden | excluded_from_recommendation
- eligibility_text    text
- exclusion_text      text
- required_docs       jsonb
- evaluation_items    jsonb
- parsed_conditions   jsonb  -- 지역·업력·업종·매출 등 구조화 조건
- application_url     text
- raw_content         text null -- 기본은 선택 저장
- summary_text        text null -- 선택 저장
- sync_status         text  -- synced | updated | failed
- synced_at           timestamp
- archived_at         timestamp null
- UNIQUE(source, external_id)
```

### 9.4 diagnoses (진단 결과)

```sql
diagnoses
- id                  uuid primary key
- user_id             uuid references users(id)
- business_profile_id uuid references business_profiles(id)
- mode                text  -- 'quick' | 'real'
- grade               text
- self_pct            numeric
- expert_pct          numeric
- recommended_programs jsonb
- risk_factors        jsonb
- summary             text
- created_at          timestamp
```

### 9.5 eligibility_checks (자격판정)

```sql
eligibility_checks
- id                  uuid primary key
- user_id             uuid references users(id)
- program_id          uuid references support_programs(id)
- business_profile_id uuid references business_profiles(id)
- status              text  -- 'likely_eligible' | 'review_needed' | 'likely_ineligible'
- score               numeric
- matched_conditions  jsonb
- unmatched_conditions jsonb
- warnings            jsonb
- llm_explanation     text
- source_clauses      jsonb  -- 판정 근거 공고 원문 조항
- created_at          timestamp
```

### 9.6 generated_documents (생성 문서)

```sql
generated_documents
- id              uuid primary key
- user_id         uuid references users(id)
- program_id      uuid references support_programs(id)
- doc_type        text  -- 'business_plan_gov' | 'business_plan_psst' | 'checklist' | 'timeline' | 'settlement'
- template        text  -- 'gov' | 'psst'
- title           text
- content_md      text
- quality_score   numeric
- eval_score      numeric
- version         int
- status          text  -- 'draft' | 'reviewing' | 'final'
- created_at      timestamp
- updated_at      timestamp
```

### 9.7 alert_profiles (알림 프로파일 — JSON → DB 이식)

```sql
alert_profiles
- id          uuid primary key
- user_id     uuid references users(id)
- keywords    text[]
- industries  text[]
- regions     text[]
- sources     text[]
- is_active   boolean
- created_at  timestamp
- updated_at  timestamp
```

### 9.8 benefit_history (v1 제외, v2 사후관리 모듈로 이동)

수혜 이력 관리는 정책자금 추천·검색·자격판정·사업계획서 초안 생성의 v1 핵심 흐름에 직접 필요하지 않다. v1에서는 제외하고, 수혜 이후 집행률·잔액·마일스톤 관리는 v2 또는 별도 사후관리 모듈에서 검토한다.

### 9.9 home_recommendation_slots (홈 추천 배너 슬롯)

```sql
home_recommendation_slots
- id                uuid primary key
- slot_type         text  -- 'deadline' | 'new' | 'popular' | 'personalized' | 'category'
- program_id        uuid references support_programs(id)
- display_title     text
- display_summary   text
- badge_text        text
- priority          int
- is_active         boolean
- starts_at         timestamp
- ends_at           timestamp
- created_at        timestamp
- updated_at        timestamp
```

### 9.10 program_impressions (공고 노출·클릭 로그)

```sql
program_impressions
- id             uuid primary key
- user_id        uuid
- program_id     uuid references support_programs(id)
- surface        text  -- 'home_banner' | 'search_result' | 'detail_related'
- event_type     text  -- 'impression' | 'click' | 'eligibility_click' | 'document_click'
- conditions     jsonb -- 당시 추출 조건 또는 검색 조건
- created_at     timestamp
```

이 테이블은 향후 “인기 공고”, “클릭률 높은 공고”, “사용자 조건별 추천 품질 개선”에 활용한다.

### 9.11 customer_inquiries (고객 문의·오류 신고)

```sql
customer_inquiries
- id              uuid primary key
- user_id          uuid references users(id) null
- inquiry_type    text -- general | partnership | error_report | refund | legal
- name            text
- email           text
- subject         text
- message         text
- related_program_id uuid references support_programs(id) null
- status          text -- received | in_progress | resolved | closed
- created_at      timestamptz
- updated_at      timestamptz
```

### 9.12 policy_documents (약관·개인정보처리방침 버전 관리)

```sql
policy_documents
- id              uuid primary key
- document_type   text -- terms | privacy | disclaimer | refund_policy
- version         text
- title           text
- content_md      text
- effective_date  date
- is_active       boolean
- created_at      timestamptz
```

### 9.13 api_logs

```sql
api_logs
- id              uuid primary key
- user_id         uuid
- api_type        text  -- 'bizinfo' | 'kstartup' | 'smes24' | 'llm'
- endpoint        text
- status          text
- request_summary jsonb
- response_summary jsonb
- tokens_used     int
- error_message   text
- created_at      timestamp
```

---

## 10. 환경변수 설계

### 10.1 서버 전용 환경변수 (NEXT_PUBLIC_ 사용 금지)

```env
# 공공 API
BIZINFO_API_KEY=
PUBLIC_DATA_SERVICE_KEY=
SMES24_API_KEY=

# LLM
ANTHROPIC_API_KEY=

# Supabase (서버 전용)
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# 결제 (추후)
PAYMENT_SECRET_KEY=

# 공고 동기화 Cron 보호
CRON_SECRET=

# MCP 응답 형식 (optional)
GOV_MCP_JSON_PRETTY=
```

### 10.2 클라이언트 공개 환경변수

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_APP_URL=
```

### 10.3 보안 원칙

```
공공 API 키         → 서버 전용 (API Routes에서만 호출)
ANTHROPIC_API_KEY  → 서버 전용 (절대 클라이언트 노출 금지)
SERVICE_ROLE_KEY   → 서버 전용 (lib/supabase/admin.ts에서만 사용)
NEXT_PUBLIC_*      → 공개되어도 무방한 값만 허용
```

---

## 11. 개발 단계 (Phase)

### Phase 1 — 프로젝트 기반 구축

```
Next.js 프로젝트 생성 (App Router + TypeScript)
Vercel 배포 설정
Supabase 프로젝트 생성 + Auth 연결
기본 화면 구성 (홈·자연어 검색창·조건 확인 카드·AI 추천 지원사업 배너)
Tailwind CSS + shadcn/ui 설정
환경변수 구성
```

### Phase 2 — gov_support_mcp 이식

```
gov_support_mcp 저장소 또는 로컬 소스 확보
server.ts 및 MCP SDK 제거
clients/ core/ tools/ types/ 파일 lib/gov-support/로 이식
경로 import 수정
store.ts Supabase 구현체 교체
env.ts Next.js 환경변수 방식으로 수정
```

### Phase 3 — 공고 DB 구축

```
support_programs 테이블 생성
home_recommendation_slots, program_impressions 테이블 생성
/api/admin/sync route 구현 (공고 수집 + 정규화 + dedup)
Vercel Cron 또는 Supabase Edge Function으로 일일 동기화
관리자 화면 (동기화 상태·로그)
```

### Phase 4 — 핵심 검색·자격판정 파이프라인

```
/api/query/parse route 구현 (자연어 조건 추출)
/api/search route 구현 (unifiedSearch + compareByRegion)
/api/home/recommendations route 구현 (메인 추천 배너 데이터)
/api/eligibility route 구현 (checkEligibility)
자연어 입력 → 조건 확인 카드 → 방식 선택 흐름 구현
실제 공고 결과 화면 구현
자격판정 결과 표시 (likely_eligible 필터)
```

### Phase 5 — 문서 생성 파이프라인

```
/api/documents/* routes 구현
서류 체크리스트 화면
타임라인 화면
사업계획서 생성 (gov/psst 선택)
generated_documents 저장
```

### Phase 6 — 심사 지원 파이프라인

```
/api/evaluate/* routes 구현
품질 측정 결과 화면 (assessBusinessPlanQuality)
심사 점수 예측 화면 (evaluateStartupApplication)
3단계 파이프라인 UI 연결
PDF/Word 다운로드 기능
```

### Phase 7 — 관리 기능

```
/api/manage/* routes 구현
알림 프로파일 CRUD 화면
수혜 이력 관리 화면
정산 보고서 생성
내 신청 관리 대시보드
```

### Phase 8 — 운영 필수 페이지 구현

```text
/about 서비스 소개 페이지
/guide 이용안내 페이지
/terms 이용약관 페이지
/privacy 개인정보처리방침 페이지
/disclaimer 법적 고지 페이지
/contact 고객센터·문의 페이지
/faq 자주 묻는 질문 페이지
Footer 링크 및 모바일 하단 링크 구성
약관·개인정보처리방침 버전 관리
```

### Phase 9 — BM 기능

```
요금제 설계 (Free/Starter/Pro/Premium)
결제 API 연동 (토스페이먼츠 또는 포트원)
사용량 제한 미들웨어
구독 플랜 관리
건당 결제 구현
컨설턴트 플랜 (B2B)
```

---

## 12. 비즈니스 모델

### 12.1 B2C 요금제

| 플랜 | 가격 | 핵심 기능 |
|---|---|---|
| Free | 무료 | 공고 검색·빠른 AI 진단 월 3회 |
| Starter | 월 9,900원 | 상세 진단 월 10회·서류 체크리스트 |
| Pro | 월 29,000원 | 진단 30회·계획서 월 3건·PDF 다운로드 |
| Premium | 월 59,000원 | 무제한·계획서 월 10건·우선 AI 생성 |

### 12.2 건당 과금

| 상품 | 가격 |
|---|---|
| 상세 자격판정 1건 | 3,900원 |
| 서류 체크리스트 1건 | 4,900원 |
| 사업계획서 초안 1건 | 19,900원 |
| 심사 점수 예측 1건 | 9,900원 |
| 계획서 + 점수예측 패키지 | 29,900원 |

### 12.3 B2B (컨설턴트)

| 플랜 | 가격 | 제공 |
|---|---|---|
| Consultant Basic | 월 49,000원 | 고객 20명·문서 20건 |
| Consultant Pro | 월 149,000원 | 고객 100명·문서 100건 |
| Agency | 월 399,000원 | 고객 500명·팀원 계정·브랜드 리포트 |

### 12.4 B2G (기관·지자체)

| 항목 | 가격 |
|---|---|
| 초기 구축비 | 500만~3,000만원 |
| 월 운영비 | 50만~300만원 |

---

## 13. 리스크 및 대응

| 리스크 | 설명 | 대응 |
|---|---|---|
| 공공 API 불안정 | 기관별 응답 품질·가용성 차이 | TTL 캐시·재시도 로직·fallback |
| 중소벤처24 IP 제한 | 서버 IP 등록 전 타임아웃 | bizinfo+K-Startup 우선, SMES24 Phase 후반 활성화 |
| LLM 환각 | 없는 조건 생성 가능 | 공고 원문 근거 기반 생성·`source_clauses` 추적 |
| 자격판정 오류 | 실제 심사와 다를 수 있음 | 참고용 고지·원문 링크 필수 제공 |
| Vercel Cron 한계 | 서버리스 타임아웃·실행 횟수 제한 | 공고 수 증가 시 Supabase Edge Function 또는 Upstash QStash 전환 |
| LLM 비용 증가 | 토큰 사용량 비례 비용 | `GOV_MCP_JSON_PRETTY` 기본 off·maxPerSource 20 제한·유료 과금 연동 |
| 법적 책임 | 선정 보장 오해 | 면책 고지 필수 표시 |

---

## 14. 서비스 운영 필수 페이지

제안 이미지의 상단 네비게이션과 푸터에 포함된 서비스 소개, 이용안내, 이용약관, 개인정보처리방침, 법적 고지, 고객센터는 실제 웹서비스 운영에 필요한 독립 페이지로 구성한다. 이 페이지들은 단순 링크가 아니라 사용자의 신뢰 형성, 법적 고지, 개인정보 보호 안내, 유료 기능 이용 조건을 설명하는 공식 정보 영역이다.

### 14.1 상단 네비게이션 구조

| 메뉴 | 경로 | 목적 |
|---|---|---|
| 서비스 소개 | `/about` | PolicyFund AI v2의 역할, 데이터 기반, 차별점 설명 |
| 지원사업 찾기 | `/search` | 자연어 검색 또는 필터 기반 공고 탐색 |
| 사업계획서 | `/documents/plan` | 선택 공고 기반 사업계획서 초안 생성 |
| 이용안내 | `/guide` | 서비스 사용법과 결과 해석 방법 안내 |
| 로그인 | `/login` | 사용자 계정 접근 |
| 회원가입 | `/signup` | 신규 사용자 등록 |

### 14.2 푸터 구조

```text
PolicyFund AI v2
├── 서비스
│   ├── 서비스 소개
│   ├── 지원사업 찾기
│   ├── 사업계획서 생성
│   ├── 이용안내
│   └── 요금제
│
├── 정책/고지
│   ├── 이용약관
│   ├── 개인정보처리방침
│   ├── 법적 고지
│   └── 환불정책
│
└── 고객지원
    ├── 고객센터
    ├── 자주 묻는 질문
    ├── 오류 신고
    └── 제휴/컨설턴트 문의
```

### 14.3 페이지별 요구사항

#### `/about` 서비스 소개

- PolicyFund AI v2가 기존 단일페이지 앱의 수정본이 아니라 신규 개발 서비스임을 명시한다.
- 실제 공공 API와 Supabase 캐시 DB 기반으로 공고를 조회한다는 점을 설명한다.
- LLM은 공고를 임의 생성하지 않고 조건 추출, 설명 보완, 문서 초안 생성에 사용된다는 원칙을 안내한다.
- 주요 기능: 자연어 검색, 조건 자동 추출, 실제 공고 매칭, 자격판정, 서류 체크리스트, 사업계획서 초안 생성.

#### `/guide` 이용안내

- 자연어 질문 예시를 제공한다.
- 조건 추출 칩의 의미와 수정 방법을 설명한다.
- “빠른 AI 진단”과 “실제 공고 맞춤 검색”의 차이를 설명한다.
- 자격판정 결과의 `신청 가능`, `검토 필요`, `어려움` 상태 배지 의미를 설명한다.
- 사업계획서 초안 생성, 서류 체크리스트, 타임라인 기능 사용 순서를 안내한다.

#### `/terms` 이용약관

- 회원가입, 계정 관리, 서비스 이용 범위를 정의한다.
- 무료/유료 기능, 건당 결제, 구독형 플랜의 이용 조건을 명시한다.
- 사용자가 입력한 회사 정보와 문서 생성 결과의 사용 책임 범위를 명시한다.
- 서비스 중단, 데이터 오류, 공공 API 장애 상황에 대한 처리 기준을 포함한다.

#### `/privacy` 개인정보처리방침

- 수집 항목: 이메일, 이름, 회사명, 업종, 지역, 매출 범위, 직원 수, 업력, 입력 질문, 생성 문서 내역.
- 이용 목적: 공고 추천, 자격판정, 문서 생성, 고객지원, 결제 및 사용량 관리.
- 보관 기간: 회원 탈퇴 또는 법정 보관 기간 종료 시까지.
- 제3자 제공 여부, Supabase/Auth/결제대행사 사용 여부를 명확히 표시한다.
- 사용자가 입력한 사업 정보가 LLM 처리에 사용될 수 있음을 안내하되, 민감정보 입력을 최소화하도록 유도한다.

#### `/disclaimer` 법적 고지

- 추천 결과는 참고용이며 선정 또는 지원금 수령을 보장하지 않는다고 명시한다.
- 최종 신청 가능 여부는 공고 원문과 주관기관 심사 기준을 따른다고 명시한다.
- 사업계획서 초안은 제출 전 사용자가 반드시 검토·수정해야 한다고 안내한다.
- 공고 원문 링크와 데이터 출처를 함께 제공하는 원칙을 명시한다.

#### `/contact` 고객센터/문의

- 일반 문의, 제휴 문의, 컨설턴트 플랜 문의, 오류 신고, 환불 문의를 접수한다.
- 문의 유형, 이름, 이메일, 제목, 내용, 관련 공고 ID를 입력받는다.
- 접수 내용은 `customer_inquiries` 테이블에 저장한다.

#### `/faq` 자주 묻는 질문

- “AI가 공고를 직접 만드는가?” → 아니며 실제 API/DB 기반 검색이라고 설명한다.
- “자격판정이 확정 결과인가?” → 참고용이라고 설명한다.
- “사업계획서를 그대로 제출해도 되는가?” → 사용자 검토와 수정이 필요하다고 설명한다.
- “내 회사 정보는 어디에 저장되는가?” → Supabase DB와 개인정보처리방침 기준으로 설명한다.

### 14.4 UI 반영 원칙

| 위치 | 반영 내용 |
|---|---|
| Desktop Header | 서비스 소개, 지원사업 찾기, 사업계획서, 이용안내, 로그인, 회원가입 |
| Mobile Header | 로고, 검색 진입, 햄버거 메뉴 |
| Footer | 서비스 링크, 정책/고지 링크, 고객지원 링크 |
| 모든 결과 화면 | 법적 고지와 공고 원문 확인 안내 |
| 결제/문서 생성 화면 | 이용약관, 개인정보처리방침, 환불정책 링크 |

---

## 15. 법적 고지 문구

서비스 내 모든 결과 화면에 아래 문구를 명확히 표시한다.

```
본 서비스의 자격판정 및 추천 결과는 공고 원문과 사용자가 입력한 정보를 
바탕으로 한 참고용 분석입니다.

실제 신청 가능 여부와 선정 여부는 각 주관기관의 최종 심사 기준에 따라 
달라질 수 있습니다.

본 서비스는 정책자금 선정 또는 지원금 수령을 보장하지 않습니다.

신청 전 반드시 공고 원문과 주관기관 안내사항을 확인하시기 바랍니다.
```

---

*PRD 문서 번호: PF-WEB-001 v1.7*  
*기반 MCP 버전: gov_support_mcp v1.2.3 (MCP-GOV-001 v1.3)*  
*작성일: 2026-05-09 / 수정일: 2026-05-11*
*개발 성격: 기존 GitHub Pages 단일페이지 수정이 아닌 신규 웹서비스 개발*


---

## 부록 A. v1.4 변경 요약

1. 제안 이미지 기준으로 홈 화면 구조를 검색 중심 랜딩으로 재정의했다.
2. 메인 화면에 `AI 추천 지원사업 배너`를 추가했다.
3. 추천 배너는 LLM 생성 데이터가 아니라 실제 공공 API 또는 Supabase 캐시 DB 기반으로 표시하도록 명시했다.
4. `/api/home/recommendations`, `/api/programs/trending` API Route를 추가했다.
5. `home_recommendation_slots`, `program_impressions` 테이블을 추가했다.
6. 홈 UI에 자연어 검색창, 조건 추출 칩, 추천 공고 카드, 4단계 이용 흐름, 신뢰 요소, CTA를 반영했다.
7. K-Startup, 기업마당, Grants.gov, Instrumentl을 UI/UX 참고 방향으로 정리했다.
8. 제안 이미지에 포함된 서비스 소개, 이용안내, 이용약관, 개인정보처리방침, 법적 고지, 고객센터, FAQ를 운영 필수 페이지로 추가했다.
9. Header/Footer 정보 구조를 PRD에 명시했다.
10. `/api/contact`, `/api/feedback`, `customer_inquiries`, `policy_documents`를 추가했다.
11. 법적 고지 문구 섹션 번호를 15번으로 조정했다.

---

## 16. v1.5 개발 명세 보강

### 16.1 v1.5 반영 원칙

본 v1.5에서는 v1.4 분석 결과에서 확인된 구조적 누락 사항을 모두 보강한다.

핵심 반영 사항은 다음과 같다.

| 구분 | v1.4 상태 | v1.5 반영 |
|---|---|---|
| 자연어 조건 추출 | 예시 중심 | `/api/query/parse` 상세 명세 추가 |
| 필드명 | 일부 혼재 | 표준 필드명과 매핑 규칙 추가 |
| 금액 단위 | 원/만원 표현 혼재 | KRW 원 단위 정수로 통일 |
| 추천 배너 | API 존재, 기준 부족 | 추천/트렌딩 산식 추가 |
| 피드백 | API 존재, 테이블 없음 | `feedback` 테이블 추가 |
| 결제/사용량 | BM만 존재 | 결제·구독·사용량 DB/API 추가 |
| 로그인/회원가입 | 네비게이션만 존재 | 화면 목록과 기능 명세 추가 |
| 환불정책 | 푸터 링크만 존재 | `/refund-policy` 페이지 추가 |
| 공고 상세 | 화면만 존재 | `/api/programs/[id]` 추가 |
| RLS | 적용 예정만 기재 | 테이블별 RLS 정책 추가 |
| 문서 다운로드 | PDF/Word 중심 | CSV/XLSX 내보내기로 변경 |
| 공공 API | 데이터 소스만 기재 | API 키 보유 전제, 연동 명세와 필드 매핑 추가 |
| 관리자 페이지 | 개요 수준 | 관리자 화면 구조 제안 추가 |

---

### 16.2 표준 데이터 필드명

자연어 입력, API 요청/응답, Supabase DB 간 필드명을 아래 기준으로 통일한다.

#### 16.2.1 표준 회사 조건 필드

| 표준 필드명 | 타입 | 설명 | 예시 |
|---|---:|---|---|
| `region` | string | 사업장 소재 지역 | `"경기도"` |
| `city` | string \| null | 시·군·구 | `"성남시"` |
| `industry` | string | 업종명 | `"제조업"` |
| `business_age_years` | number \| null | 업력, 년 단위 | `3` |
| `employee_count` | number \| null | 직원 수 | `5` |
| `annual_revenue_krw` | number \| null | 연매출, 원 단위 | `200000000` |
| `credit_score` | number \| null | 신용점수 | `750` |
| `tax_arrears` | boolean \| null | 세금 체납 여부 | `false` |
| `desired_amount_krw` | number \| null | 신청 희망 금액, 원 단위 | `50000000` |
| `support_purpose` | string \| null | 지원 목적 | `"운영자금"` |
| `business_type` | string \| null | 개인/법인 구분 | `"개인사업자"` |
| `startup_stage` | string \| null | 예비창업/초기/성장/재도전 등 | `"초기창업"` |

#### 16.2.2 기존 표현과 표준 필드 매핑

| 기존/예시 표현 | 표준 필드명 | DB 컬럼 |
|---|---|---|
| `businessAge`, `bizAge` | `business_age_years` | `business_age_years` |
| `employeeCount`, `workers` | `employee_count` | `employee_count` |
| `revenue`, `annualRev` | `annual_revenue_krw` | `annual_revenue_krw` |
| `purpose` | `support_purpose` | `support_purpose` |
| `amount`, `desiredAmount` | `desired_amount_krw` | `desired_amount_krw` |
| `taxIssue` | `tax_arrears` | `tax_arrears` |

#### 16.2.3 금액 단위 표준

모든 API 및 DB 저장 금액 단위는 **KRW 원 단위 정수**로 통일한다.

| 구분 | 저장/전송 기준 | 화면 표시 |
|---|---|---|
| 연매출 | `annual_revenue_krw: 200000000` | `2억 원` |
| 신청 희망 금액 | `desired_amount_krw: 50000000` | `5천만 원` |
| 지원 금액 | `support_amount_min_krw`, `support_amount_max_krw` | `최대 5억 원` |

화면에는 한국어 금액 포맷터를 적용한다.

```ts
formatKRW(200000000) // "2억 원"
formatKRW(50000000)  // "5천만 원"
```

---

### 16.3 자연어 조건 추출 API

#### 16.3.1 `POST /api/query/parse`

사용자의 자연어 질문을 구조화된 검색 조건으로 변환한다.  
LLM은 공고를 검색하거나 생성하지 않고, **조건 추출과 누락값 판단**만 수행한다.

#### Request

```json
{
  "query": "경기도에서 3년 된 제조업체를 운영 중인데 직원은 5명이고 매출은 2억 정도야. 운영자금 받을 수 있는 정책자금 찾아줘.",
  "profile_id": "optional-profile-uuid"
}
```

#### Response

```json
{
  "normalized_query": "경기도 제조업 3년차 운영자금 정책자금 검색",
  "conditions": {
    "region": "경기도",
    "city": null,
    "industry": "제조업",
    "business_age_years": 3,
    "employee_count": 5,
    "annual_revenue_krw": 200000000,
    "credit_score": null,
    "tax_arrears": null,
    "desired_amount_krw": null,
    "support_purpose": "운영자금",
    "business_type": null,
    "startup_stage": null
  },
  "confidence": {
    "region": 0.98,
    "industry": 0.95,
    "business_age_years": 0.94,
    "employee_count": 0.96,
    "annual_revenue_krw": 0.9,
    "support_purpose": 0.92
  },
  "missing_fields": [
    "credit_score",
    "tax_arrears",
    "desired_amount_krw"
  ],
  "needs_user_confirmation": [
    {
      "field": "annual_revenue_krw",
      "reason": "자연어에서 '2억 정도'라고 표현되어 근사값으로 추출됨"
    }
  ],
  "next_question": "신용점수, 세금 체납 여부, 신청 희망 금액을 알면 더 정확히 추천할 수 있습니다. 모르면 '모름'으로 진행할 수 있습니다."
}
```

#### 처리 규칙

| 항목 | 규칙 |
|---|---|
| LLM 역할 | 자연어 조건 추출, 모호한 값 표시, 추가 질문 생성 |
| 금지 | LLM이 존재하지 않는 공고를 생성하거나 검색 결과를 임의 작성 |
| 필수 확인 | 신뢰도 0.75 미만 필드는 사용자 확인 필요 |
| 금액 처리 | 자연어 금액은 원 단위 정수로 변환 |
| 누락값 처리 | 누락값은 `null`로 저장하고 `missing_fields`에 포함 |
| 모름 처리 | 사용자가 모름 선택 시 `null` 유지 후 검색 진행 |

---

### 16.4 공고 검색 및 상세 API

#### 16.4.1 `POST /api/search`

실제 공공 API 또는 Supabase `support_programs` DB를 기반으로 공고를 검색한다.

```json
{
  "conditions": {
    "region": "경기도",
    "industry": "제조업",
    "business_age_years": 3,
    "employee_count": 5,
    "annual_revenue_krw": 200000000,
    "support_purpose": "운영자금"
  },
  "page": 1,
  "page_size": 10,
  "sort": "recommendation_score"
}
```

#### 16.4.2 `GET /api/programs/[id]`

개별 공고 상세 정보를 반환한다.

#### Response

```json
{
  "id": "program-uuid",
  "source": "bizinfo",
  "external_id": "BIZ-2026-00001",
  "title": "중소기업 정책자금 운전자금",
  "organization": "중소벤처기업부",
  "region": ["전국"],
  "industry": ["제조업", "서비스업"],
  "support_type": "운영자금",
  "support_amount_min_krw": 0,
  "support_amount_max_krw": 500000000,
  "application_start_date": "2026-05-01",
  "application_end_date": "2026-06-30",
  "status": "open",
  "eligibility_text": "공고 원문 기준 신청대상",
  "exclusion_text": "공고 원문 기준 제외대상",
  "required_docs": ["사업자등록증", "재무제표", "사업계획서"],
  "evaluation_items": ["사업성", "성장성", "상환능력"],
  "parsed_conditions": {
    "business_age_max_years": 7,
    "allowed_regions": ["전국"],
    "excluded": ["세금 체납", "휴폐업"]
  },
  "application_url": "https://...",
  "raw_content": "공고 원문 요약 또는 수집 원문",
  "synced_at": "2026-05-11T00:00:00+09:00"
}
```

---

### 16.5 홈 추천 및 트렌딩 API

#### 16.5.1 `GET /api/home/recommendations`

홈 메인 영역의 **AI 추천 지원사업 배너** 데이터를 제공한다.  
해당 데이터는 LLM이 생성하지 않으며, 실제 공공 API 또는 Supabase DB의 공고만 표시한다.

#### Query Parameters

| 파라미터 | 타입 | 설명 |
|---|---:|---|
| `profile_id` | string | 로그인 사용자의 회사 프로필 ID |
| `region` | string | 비로그인 사용자 지역 필터 |
| `industry` | string | 비로그인 사용자 업종 필터 |
| `limit` | number | 기본 6, 최대 12 |

#### 추천 점수 산식

```text
recommendation_score =
  condition_match_score * 0.45
+ deadline_score * 0.20
+ freshness_score * 0.15
+ popularity_score * 0.10
+ document_readiness_score * 0.10
```

| 점수 | 설명 |
|---|---|
| `condition_match_score` | 지역, 업종, 업력, 직원 수, 매출 조건 매칭 |
| `deadline_score` | 마감일이 임박하되 신청 가능 기간이 남은 공고 우대 |
| `freshness_score` | 최근 동기화 또는 신규 등록 공고 우대 |
| `popularity_score` | 최근 7일 조회/클릭 기반 |
| `document_readiness_score` | 필수서류, 평가항목, 신청URL 등이 충분한 공고 우대 |

#### 16.5.2 `GET /api/programs/trending`

인기·마감임박·신규 공고를 제공한다.

| 모드 | 기준 |
|---|---|
| `popular` | 최근 7일 `program_impressions`, 클릭, 상세조회 수 |
| `deadline` | `application_end_date`가 가까운 공고 |
| `new` | 최근 동기화된 신규 공고 |
| `recommended` | 사용자 조건 기반 추천 점수 |

```json
{
  "mode": "popular",
  "limit": 6
}
```

---

### 16.6 추천 모듈 파일 구조

```text
src/
└── lib/
    ├── gov-support/
    │   ├── clients/
    │   ├── tools/
    │   │   ├── unifiedSearch.ts
    │   │   ├── eligibility.ts
    │   │   ├── documentChecklist.ts
    │   │   ├── timeline.ts
    │   │   ├── draftTools.ts
    │   │   ├── evaluateStartup.ts
    │   │   └── assessQuality.ts
    │   └── types/
    ├── recommendation/
    │   ├── homeRecommendations.ts
    │   ├── trendingPrograms.ts
    │   ├── recommendationScore.ts
    │   └── conditionMatcher.ts
    ├── query/
    │   ├── parseNaturalLanguage.ts
    │   ├── conditionMapper.ts
    │   └── amountNormalizer.ts
    ├── billing/
    ├── google/
    │   ├── sheetsClient.ts
    │   ├── exportBusinessPlanToSheet.ts
    │   └── exportSearchResultsToSheet.ts
    └── admin/
```

---

### 16.7 자격판정 상태값 매핑

| 내부 상태값 | 화면 표시 | 설명 |
|---|---|---|
| `likely_eligible` | 신청 가능 | 주요 조건 충족 |
| `review_needed` | 검토 필요 | 일부 조건 누락 또는 공고 해석 필요 |
| `likely_ineligible` | 어려움 | 핵심 조건 불일치 |
| `unknown` | 확인 필요 | 공고 데이터 부족 또는 사용자 조건 부족 |

LLM은 위 상태값을 직접 결정하지 않는다.  
룰 기반 판정 후, 사용자에게 이해하기 쉬운 설명과 보완 방향을 작성한다.

---

### 16.8 빠른 AI 진단 산식

빠른 AI 진단은 실제 공고 기반 결과가 아니라, 입력 조건을 기반으로 한 **참고용 사전 진단**이다.

#### 진단 점수 산식

```text
quick_diagnosis_score =
  business_age_score * 0.20
+ revenue_score * 0.15
+ employee_score * 0.10
+ credit_score_score * 0.15
+ tax_status_score * 0.20
+ desired_amount_score * 0.10
+ industry_fit_score * 0.10
```

#### 등급 기준

| 점수 | 등급 | 화면 표시 |
|---:|---|---|
| 85 이상 | A | 신청 가능성 높음 |
| 70~84 | B | 신청 가능성 있음 |
| 55~69 | C | 검토 필요 |
| 40~54 | D | 보완 필요 |
| 39 이하 | E | 어려움 |

#### 필수 고지

빠른 진단 결과 화면에는 다음 문구를 표시한다.

```text
이 결과는 실제 공고를 기준으로 한 확정 판정이 아니라, 입력 조건을 기반으로 한 참고용 사전 진단입니다.
정확한 신청 가능 여부는 실제 공고 조건과 주관기관 기준에 따라 달라질 수 있습니다.
```

---

### 16.9 Supabase 테이블 보강

#### 16.9.1 `business_profiles`

```sql
create table business_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  company_name text,
  region text,
  city text,
  industry text,
  business_age_years numeric,
  employee_count integer,
  annual_revenue_krw bigint,
  credit_score integer,
  tax_arrears boolean,
  desired_amount_krw bigint,
  support_purpose text,
  business_type text,
  startup_stage text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

#### 16.9.2 `support_programs` 보강

```sql
alter table support_programs
  add column if not exists category text,
  add column if not exists target_business_type text,
  add column if not exists support_amount_min_krw bigint,
  add column if not exists support_amount_max_krw bigint,
  add column if not exists application_start_date date,
  add column if not exists application_end_date date,
  add column if not exists status text default 'unknown',
  add column if not exists parsed_conditions jsonb,
  add column if not exists view_count integer default 0,
  add column if not exists click_count integer default 0;
```

#### 16.9.3 `feedback`

```sql
create table feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  target_type text not null,
  target_id uuid,
  rating integer,
  feedback_text text,
  metadata jsonb,
  created_at timestamptz default now()
);
```

#### 16.9.4 `subscriptions`

```sql
create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  plan_code text not null,
  status text not null,
  started_at timestamptz,
  ended_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  payment_provider text,
  provider_subscription_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

#### 16.9.5 `payments`

```sql
create table payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  subscription_id uuid references subscriptions(id),
  amount_krw bigint not null,
  status text not null,
  payment_provider text,
  provider_payment_id text,
  paid_at timestamptz,
  refunded_at timestamptz,
  metadata jsonb,
  created_at timestamptz default now()
);
```

#### 16.9.6 `usage_events`

```sql
create table usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  event_type text not null,
  quantity integer default 1,
  related_id uuid,
  metadata jsonb,
  created_at timestamptz default now()
);
```

#### 16.9.7 `billing_webhooks`

```sql
create table billing_webhooks (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text,
  event_type text,
  payload jsonb,
  processed boolean default false,
  processed_at timestamptz,
  created_at timestamptz default now()
);
```

#### 16.9.8 `file_exports`

```sql
create table file_exports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  export_type text not null, -- search_results | eligibility_result | business_plan | checklist | timeline
  file_format text not null, -- csv | xlsx
  source_type text not null, -- search_session | diagnosis | generated_document
  source_id uuid,
  title text,
  storage_path text,
  download_url text,
  status text not null default 'pending', -- pending | processing | success | failed | expired
  error_message text,
  expires_at timestamptz,
  created_at timestamptz default now(),
  completed_at timestamptz
);
```

#### 16.9.9 `api_sync_logs`

```sql
create table api_sync_logs (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  status text not null,
  requested_count integer,
  inserted_count integer,
  updated_count integer,
  failed_count integer,
  error_message text,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz default now()
);
```

---

### 16.10 RLS 정책 기준

| 테이블 | 조회 | 생성 | 수정 | 삭제 |
|---|---|---|---|---|
| `business_profiles` | 본인만 | 본인만 | 본인만 | 본인만 |
| `diagnoses` | 본인만 | 본인만 | 본인만 | 제한 |
| `generated_documents` | 본인만 | 본인만 | 본인만 | 본인만 |
| `file_exports` | 본인만 | 본인만 | 본인만 | 본인만 |
| `feedback` | 본인만 | 본인만 | 본인만 | 제한 |
| `customer_inquiries` | 본인만 | 본인만 | 본인만 | 제한 |
| `support_programs` | 공개 | 관리자만 | 관리자만 | 관리자만 |
| `policy_documents` | 공개 | 관리자만 | 관리자만 | 관리자만 |
| `home_recommendation_slots` | 공개 | 관리자만 | 관리자만 | 관리자만 |
| `api_sync_logs` | 관리자만 | 시스템/관리자 | 시스템/관리자 | 관리자만 |
| `payments` | 본인만 | 시스템만 | 시스템만 | 제한 |
| `subscriptions` | 본인만 | 시스템만 | 시스템만 | 제한 |
| `usage_events` | 본인만 | 시스템만 | 시스템만 | 제한 |
| `billing_webhooks` | 관리자만 | 시스템만 | 시스템만 | 제한 |

---

### 16.11 결제·구독·사용량 API

요금제 기능이 포함되는 경우 아래 API를 추가한다.

| API | Method | 설명 |
|---|---|---|
| `/api/billing/checkout` | POST | 결제 세션 생성 |
| `/api/billing/webhook` | POST | 결제사 웹훅 수신 |
| `/api/billing/subscription` | GET | 현재 구독 상태 조회 |
| `/api/billing/usage` | GET | 현재 사용량 조회 |
| `/api/billing/cancel` | POST | 구독 해지 요청 |
| `/api/billing/refund-request` | POST | 환불 요청 접수 |

환경변수는 실제 값이 아니라 키 이름만 PRD에 정의한다.

```env
PAYMENT_PROVIDER=
PAYMENT_SECRET_KEY=
PAYMENT_WEBHOOK_SECRET=
```

---

### 16.12 로그인·회원가입·마이페이지 화면 추가

| 화면 | 경로 | 설명 |
|---|---|---|
| 로그인 | `/login` | 이메일/소셜 로그인 |
| 회원가입 | `/signup` | 신규 사용자 가입 |
| 비밀번호 재설정 | `/reset-password` | 비밀번호 재설정 |
| 마이페이지 | `/mypage` | 회사 프로필, 사용량, 구독, 생성 문서 관리 |
| 내 문서 | `/mypage/documents` | 생성된 사업계획서와 파일 내보내기 / Google Sheets 호환 이력 |
| 결제/구독 | `/mypage/billing` | 요금제, 결제 이력, 사용량 |
| 환불정책 | `/refund-policy` | 환불 기준 및 절차 안내 |

---

## 17. 관리자 페이지 제안

관리자 페이지는 `/admin` 하위에 구성한다.  
관리자는 운영자, 콘텐츠 관리자, 슈퍼관리자로 권한을 구분한다.

관리자 페이지는 단순 기능 목록이 아니라, **PolicyFund AI v2 운영 콘솔(Admin Console)**로 설계한다.  
목적은 공고 수집·검수·추천 노출·문의·피드백·결제·정책문서·파일 내보내기 / Google Sheets 호환 상태를 한 화면에서 관리하는 것이다.

**관리자 UI/UX 기준 이미지**: `policyfund_ai_v2_admin_dashboard_mockup.png`

---

### 17.1 관리자 권한

| 권한 | 설명 |
|---|---|
| `admin_viewer` | 관리자 화면 조회만 가능 |
| `admin_operator` | 공고 동기화, 문의 처리, 피드백 확인 가능 |
| `admin_content` | 약관, 안내문, 추천 슬롯, FAQ 수정 가능 |
| `admin_super` | 사용자, 결제, 시스템 설정까지 관리 가능 |

#### 권한별 접근 범위

| 메뉴 | admin_viewer | admin_operator | admin_content | admin_super |
|---|---:|---:|---:|---:|
| 대시보드 조회 | 가능 | 가능 | 가능 | 가능 |
| 공고 목록/상세 조회 | 가능 | 가능 | 가능 | 가능 |
| 공고 동기화 실행 | 불가 | 가능 | 불가 | 가능 |
| 공고 파싱값 수정 | 불가 | 가능 | 불가 | 가능 |
| 홈 배너 슬롯 수정 | 불가 | 불가 | 가능 | 가능 |
| FAQ/이용안내/정책문서 수정 | 불가 | 불가 | 가능 | 가능 |
| 문의/피드백 처리 | 불가 | 가능 | 불가 | 가능 |
| 결제/환불 처리 | 불가 | 불가 | 불가 | 가능 |
| 사용자 권한 변경 | 불가 | 불가 | 불가 | 가능 |
| 시스템 설정 변경 | 불가 | 불가 | 불가 | 가능 |

---

### 17.2 관리자 IA

```text
/admin
├── dashboard
├── programs
│   ├── list
│   ├── detail
│   ├── sync
│   └── mapping
├── recommendations
│   ├── home-slots
│   └── trending-rules
├── users
├── documents
├── file-exports
├── inquiries
├── feedback
├── billing
├── content
│   ├── policy-documents
│   ├── faq
│   └── guide
├── logs
│   ├── api-sync
│   ├── llm
│   ├── billing-webhook
│   ├── sheets-export
│   └── errors
└── settings
```

---

### 17.3 관리자 공통 레이아웃

관리자 화면은 이미지 제안안 기준으로 다음 레이아웃을 적용한다.

```text
┌─────────────────────────────────────────────────────────────┐
│ Top Header                                                  │
│ Breadcrumb | 통합 검색 | 알림 | 빠른 실행 | 관리자 프로필       │
├───────────────┬─────────────────────────────────────────────┤
│ Left Sidebar  │ Main Content                                │
│               │ KPI Cards                                   │
│ Menu Groups   │ Dashboard Panels / Tables / Forms            │
│               │                                             │
└───────────────┴─────────────────────────────────────────────┘
```

#### 17.3.1 좌측 사이드바 메뉴

좌측 사이드바는 아래 메뉴 그룹을 고정 노출한다.

| 그룹 | 메뉴 | 경로 |
|---|---|---|
| 홈 | 대시보드 | `/admin/dashboard` |
| 공고 데이터 품질관리 | active/오류/중복 공고 확인 | `/admin/programs/list` |
| 공고 데이터 품질관리 | 공고 상세 QA | `/admin/programs/detail/[id]` |
| 공고 데이터 품질관리 | 동기화 관리 | `/admin/programs/sync` |
| 공고 데이터 품질관리 | 필드 매핑 | `/admin/programs/mapping` |
| 추천 관리 | 홈 배너 슬롯 | `/admin/recommendations/home-slots` |
| 추천 관리 | 트렌딩 규칙 | `/admin/recommendations/trending-rules` |
| 사용자/문서 | 사용자 관리 | `/admin/users` |
| 사용자/문서 | 문서 관리 | `/admin/documents` |
| 사용자/문서 | 파일 내보내기 / Google Sheets 호환 | `/admin/file-exports` |
| 고객지원 | 문의 관리 | `/admin/inquiries` |
| 고객지원 | 피드백 관리 | `/admin/feedback` |
| 결제 | 결제 관리 | `/admin/billing` |
| 콘텐츠 | 정책문서 | `/admin/content/policy-documents` |
| 콘텐츠 | FAQ | `/admin/content/faq` |
| 콘텐츠 | 이용안내 | `/admin/content/guide` |
| 시스템 | 로그 관리 | `/admin/logs` |
| 시스템 | 설정 | `/admin/settings` |

#### 17.3.2 상단 헤더

상단 헤더는 모든 관리자 화면에 공통 적용한다.

| 요소 | 설명 |
|---|---|
| Breadcrumb | 현재 위치 표시. 예: `관리자 > 공고 데이터 품질관리 > 동기화 관리` |
| 통합 검색창 | 공고명, 기관명, 사용자 이메일, 문의 제목, 문서명 검색 |
| 알림 아이콘 | 동기화 실패, LLM 오류, 결제 웹훅 실패, CSV/XLSX 내보내기 실패 알림 |
| 빠른 동기화 버튼 | 주요 공공 API 동기화를 즉시 실행 |
| 배너 슬롯 관리 버튼 | 홈 추천 배너 관리 화면으로 이동 |
| 관리자 프로필 | 권한, 계정, 로그아웃 메뉴 |

#### 17.3.3 관리자 UI 톤앤매너

| 항목 | 기준 |
|---|---|
| 기본 색상 | 화이트 배경 + 신뢰감 있는 블루/네이비 계열 |
| 강조 색상 | 상태 배지에 그린/옐로우/레드 계열 사용 |
| 컴포넌트 | 라운드 카드, 표, 필터 바, 상태 배지, 사이드바 |
| 정보 밀도 | 운영자가 한 화면에서 핵심 상태를 파악할 수 있도록 중간~높은 정보 밀도 |
| 반응형 | 관리자 페이지는 데스크톱 우선, 태블릿 대응, 모바일은 조회 중심 최소 대응 |

---

### 17.4 관리자 대시보드 `/admin/dashboard`

관리자 대시보드는 이미지 제안안의 메인 화면을 기준으로 구성한다.

#### 17.4.1 KPI 카드

대시보드 상단에 KPI 카드를 표시한다.

| KPI 카드 | 설명 | 데이터 기준 |
|---|---|---|
| 총 공고 수 | 현재 DB에 저장된 전체 공고 수 | `support_programs` |
| 오늘 동기화 | 오늘 실행된 동기화 횟수와 성공/실패 수 | `api_sync_logs` |
| 배너 노출 수 | 홈 추천 배너 노출 수 | `program_impressions` |
| 문의 건수 | 신규/처리중 문의 수 | `customer_inquiries` |
| 결제 건수 | 오늘 결제 성공 건수 | `payments` |
| CSV/XLSX 내보내기 수 | 오늘 CSV/XLSX 내보내기 성공/실패 수 | `file_exports` |
| 오류 발생 수 | 최근 24시간 시스템 오류 수 | `system_alerts`, `api_logs` |
| 활성 사용자 수 | 최근 7일 로그인 또는 기능 사용 사용자 수 | `usage_events` |

#### 17.4.2 대시보드 패널 구성

```text
[상단 KPI 카드]
- 총 공고 수
- 오늘 동기화
- 배너 노출 수
- 문의 건수
- 결제 건수
- CSV/XLSX 내보내기 수
- 오류 발생 수
- 활성 사용자 수

[중단 좌측]
- 공고 동기화 현황
- 홈 배너 추천 슬롯

[중단 우측]
- 최근 문의 / 피드백
- CSV/XLSX 내보내기 현황

[하단]
- 시스템 알림
- 최근 오류 로그
```

#### 17.4.3 공고 동기화 현황 패널

| 표시 항목 | 설명 |
|---|---|
| 출처 | 기업마당, K-Startup, 중소벤처24 |
| 최근 동기화 시각 | 마지막 성공/실패 시각 |
| 상태 | `success`, `partial_success`, `failed`, `running` |
| 신규 저장 | 신규 저장된 공고 수 |
| 업데이트 | 기존 공고 업데이트 수 |
| 실패 | 실패 건수 |
| 액션 | 재동기화, 로그 보기 |

#### 17.4.4 홈 배너 추천 슬롯 패널

| 표시 항목 | 설명 |
|---|---|
| 슬롯 번호 | 메인 배너 노출 순서 |
| 공고명 | 연결된 `support_programs.title` |
| 노출 모드 | 자동 추천, 수동 고정, 캠페인 |
| 상태 | 활성, 예약, 만료, 비활성 |
| 노출 기간 | 시작일~종료일 |
| 성과 | 노출 수, 클릭 수, CTR |
| 액션 | 수정, 비활성화, 순서 변경 |

#### 17.4.5 최근 문의 / 피드백 패널

| 표시 항목 | 설명 |
|---|---|
| 유형 | 문의 또는 피드백 |
| 제목/요약 | 문의 제목 또는 피드백 요약 |
| 상태 | 신규, 처리중, 완료 |
| 작성자 | 사용자 이메일 또는 비회원 |
| 접수 시각 | 생성일 |
| 액션 | 상세 보기, 담당자 지정 |

#### 17.4.6 CSV/XLSX 내보내기 현황 패널

| 표시 항목 | 설명 |
|---|---|
| 내보내기 유형 | 검색 결과, 공고 비교표, 사업계획서 초안, 진단 결과 |
| 사용자 | 요청 사용자 |
| 상태 | 대기, 진행중, 성공, 실패 |
| 생성 시각 | 요청 시각 |
| 링크 | 생성된 CSV/XLSX 다운로드 링크 |
| 실패 사유 | 실패 시 오류 메시지 |

#### 17.4.7 시스템 알림 패널

시스템 알림 패널은 운영자가 즉시 확인해야 하는 문제를 노출한다.

| 알림 유형 | 예시 |
|---|---|
| API 동기화 실패 | 기업마당 API 응답 실패, K-Startup 타임아웃 |
| 공공 API 응답 오류 | 필수 필드 누락, 인증 실패, 응답 포맷 변경 |
| LLM 오류 | 조건 추출 실패, 사업계획서 생성 실패 |
| 결제 웹훅 실패 | 결제 승인 후 DB 반영 실패 |
| 파일 내보내기 실패 | 파일 생성 오류, Storage 저장 실패, 다운로드 URL 만료 |
| 추천 배너 오류 | 슬롯에 연결된 공고가 마감 또는 숨김 상태 |

---

### 17.5 공고 데이터 품질관리 및 노출 제어 `/admin/programs/*`

#### 17.5.1 공고 QA 목록 `/admin/programs/list`

이 화면은 공공 API에서 들어온 공고를 사람이 일일이 등록하는 화면이 아니라, **저장된 active 공고와 오류 공고를 확인하는 운영 QA 화면**이다.

| 기능 | 설명 |
|---|---|
| 공고 목록 조회 | 출처, 상태, 지역, 업종, 마감일, 노출상태 필터 |
| 공고 검색 | 공고명, 기관명, 원문 키워드 검색 |
| QA 필터 | 오류 공고, 중복 의심 공고, 마감 임박 공고, 링크 오류 공고, 파싱 실패 공고, 오늘 신규 수집 공고 |
| 공고 상태 확인 | active, closed, archived, error, duplicate_suspected |
| 노출 상태 변경 | visible, hidden, excluded_from_recommendation |
| 추천 배너 제어 | 자동 추천 후보 제외, 특정 공고 수동 고정, 고정 해제 |
| 중복 공고 처리 | 동일 공고 중복 제거 또는 대표 공고 연결 |
| CSV/XLSX 내보내기 | 관리자 QA 목록을 Google Sheets 호환 파일로 다운로드 |

##### 주요 필터

```text
- 전체 active 공고
- 오늘 새로 수집된 공고
- 마감 임박 공고
- 오류 상태 공고
- 중복 의심 공고
- 파싱 실패 공고
- 원문 URL 누락/오류 공고
- 추천 배너 후보 공고
- 추천 제외 공고
```


#### 17.5.2 공고 상세 `/admin/programs/detail/[id]`

| 영역 | 설명 |
|---|---|
| 기본 정보 | 제목, 기관, 출처, 지역, 업종, 지원유형, 지원금액, 신청기간 |
| 원문 정보 | 원문 링크, 원문 내용, 원본 응답 JSON |
| 파싱 조건 | `parsed_conditions` 확인 및 수동 보정 |
| 자격 조건 | 신청대상, 제외대상, 업력, 지역, 업종, 매출, 직원수 조건 |
| 서류/평가 | 필수서류, 평가항목, 가점항목 |
| 노출 상태 | 사용자 화면 노출 여부, 추천 배너 사용 여부 |
| 변경 이력 | 관리자 수정 이력 |

#### 17.5.3 동기화 관리 `/admin/programs/sync`

```text
[출처 선택]
- 기업마당
- K-Startup
- 중소벤처24

[동기화 실행]
- 전체 동기화
- 최근 공고만 동기화
- 특정 기간 동기화
- 특정 키워드 동기화

[동기화 로그]
- 시작 시간
- 종료 시간
- 요청 수
- 신규 저장 수
- 업데이트 수
- 실패 수
- 오류 메시지
```

공공 API 값은 사용자가 보유하고 있으므로, PRD에는 실제 키 값을 기록하지 않는다.  
개발 시 Vercel 환경변수와 Supabase Edge Secret 또는 서버 환경변수로 관리한다.

#### 17.5.4 필드 매핑 `/admin/programs/mapping`

| 기능 | 설명 |
|---|---|
| 출처별 필드 매핑 확인 | 기업마당/K-Startup/중소벤처24 응답 필드와 내부 DB 필드 매핑 |
| 필수 필드 누락 확인 | 제목, 기관, 신청기간, 원문 URL 등 필수값 누락 감지 |
| 파싱 규칙 관리 | 업력, 지역, 업종, 지원금액, 제외대상 추출 규칙 관리 |
| 샘플 응답 테스트 | API 샘플 응답을 넣고 내부 필드 매핑 결과 확인 |

---

### 17.6 추천 관리 `/admin/recommendations/*`

#### 17.6.1 홈 추천 배너 관리 `/admin/recommendations/home-slots`

| 기능 | 설명 |
|---|---|
| 자동 추천 모드 | 추천 산식 기반 자동 노출 |
| 수동 고정 슬롯 | 관리자가 특정 공고를 상단 고정 |
| 캠페인 슬롯 | 기간별 강조 공고 지정 |
| 노출 순서 조정 | 드래그 또는 우선순위 숫자로 정렬 |
| 노출 기간 설정 | 시작일/종료일 |
| A/B 테스트 | v1 제외, v2에서 운영 데이터 축적 후 검토 |
| 성과 확인 | 슬롯별 노출 수, 클릭 수, CTR, 자격판정 클릭 수 |

#### `home_recommendation_slots` 보강 필드

```sql
alter table home_recommendation_slots
  add column if not exists mode text default 'manual',
  add column if not exists priority integer default 0,
  add column if not exists starts_at timestamptz,
  add column if not exists ends_at timestamptz,
  add column if not exists is_active boolean default true,
  add column if not exists admin_note text,
  add column if not exists ab_test_group text,
  add column if not exists display_title text,
  add column if not exists display_summary text;
```

#### 17.6.2 트렌딩 규칙 `/admin/recommendations/trending-rules`

| 설정 항목 | 설명 |
|---|---|
| 집계 기간 | 최근 1일, 7일, 30일 |
| 노출 가중치 | impression 가중치 |
| 클릭 가중치 | click 가중치 |
| 자격판정 클릭 가중치 | eligibility_click 가중치 |
| 문서 생성 클릭 가중치 | document_click 가중치 |
| 마감임박 가중치 | deadline 기반 가중치 |
| 제외 조건 | 마감 공고, 숨김 공고, 오류 공고 제외 |

---

### 17.7 사용자 관리 `/admin/users`

| 기능 | 설명 |
|---|---|
| 사용자 목록 | 가입일, 요금제, 최근 접속, 사용량 확인 |
| 사용자 상세 | 사업자 프로필, 진단 이력, 생성 문서, CSV/XLSX 내보내기 이력 확인 |
| 권한 관리 | 일반 사용자, 컨설턴트, 관리자 권한 부여/회수 |
| 계정 상태 관리 | 활성, 정지, 탈퇴 요청 상태 관리 |
| 사용량 조정 | 무료 크레딧 지급, 사용량 제한 조정 |

---

### 17.8 문서 관리 `/admin/documents`

| 기능 | 설명 |
|---|---|
| 생성 문서 목록 | 사업계획서 초안, 체크리스트, 타임라인 등 조회 |
| 품질 점수 확인 | 루브릭 점수와 LLM 코멘트 확인 |
| 사용자별 문서 이력 | 특정 사용자 문서 생성 흐름 확인 |
| Google Sheets 연결 확인 | 문서가 내보내진 Sheet 링크 확인 |
| 오류 문서 확인 | 생성 실패, 내보내기 실패 문서 확인 |

---

### 17.9 파일 내보내기 / Google Sheets 호환 관리 `/admin/file-exports`

| 기능 | 설명 |
|---|---|
| 내보내기 이력 조회 | 사용자, 유형, 상태, 생성일 기준 조회 |
| 실패 재시도 | 실패한 내보내기 작업 재실행 |
| 링크 확인 | 생성된 CSV/XLSX 다운로드 URL 확인 |
| 파일 오류 확인 | 파일 생성 실패, Storage 저장 실패, URL 만료 오류 확인 |
| 유형별 통계 | 검색 결과/공고 비교표/사업계획서/진단 결과별 내보내기 수 |

---

### 17.10 문의/피드백 관리 `/admin/inquiries`, `/admin/feedback`

#### 문의 상태

| 상태 | 설명 |
|---|---|
| `new` | 신규 접수 |
| `in_progress` | 처리 중 |
| `resolved` | 처리 완료 |
| `closed` | 종료 |
| `spam` | 스팸 |

#### 문의 관리 기능

```text
문의 목록
문의 상세
담당자 지정
상태 변경
답변 메모
사용자 이메일 답변 연동 여부 검토
```

#### 피드백 관리 기능

| 기능 | 설명 |
|---|---|
| 피드백 대상별 조회 | 추천 결과, 검색 결과, 자격판정, 문서 생성 결과별 조회 |
| 평점 필터 | 낮은 점수 피드백 우선 확인 |
| 개선 태그 | 검색 부정확, 공고 오류, 문서 품질, UI 불편 등 태그 지정 |
| 운영 메모 | 관리자 메모 추가 |
| 개선 상태 | 접수, 검토중, 반영, 보류 |

---

### 17.11 결제/사용량 관리 `/admin/billing`

| 기능 | 설명 |
|---|---|
| 사용자별 구독 상태 조회 | Free/Starter/Pro/Premium |
| 결제 이력 조회 | 결제 성공/실패/환불 |
| 사용량 조회 | 검색, 문서 생성, 파일 내보내기 / Google Sheets 호환 |
| 환불 요청 관리 | 요청 상태, 승인/거절 |
| 웹훅 로그 확인 | 결제사 이벤트 처리 상태 |
| 수동 크레딧 지급 | CS 대응용 크레딧 지급 |
| 결제 실패 알림 확인 | 카드 실패, 웹훅 실패, DB 반영 실패 확인 |

---

### 17.12 콘텐츠 관리 `/admin/content/*`

#### 17.12.1 정책문서 관리 `/admin/content/policy-documents`

`policy_documents` 테이블을 이용해 버전 관리한다.

| 문서 유형 | 경로 |
|---|---|
| 이용약관 | `/terms` |
| 개인정보처리방침 | `/privacy` |
| 법적 고지 | `/disclaimer` |
| 환불정책 | `/refund-policy` |

관리자는 문서별로 다음을 관리한다.

```text
문서 유형
버전
시행일
본문
게시 상태
변경 이력
```

#### 17.12.2 FAQ 관리 `/admin/content/faq`

| 기능 | 설명 |
|---|---|
| FAQ 목록 | 카테고리, 제목, 공개 상태, 정렬 순서 조회 |
| FAQ 작성/수정 | 질문, 답변, 관련 링크 입력 |
| 카테고리 관리 | 정책자금, 검색, 자격판정, 사업계획서, 결제, Google Sheets 등 |
| 공개 상태 | 공개, 비공개, 예약 게시 |
| 정렬 관리 | 사용자 화면 노출 순서 조정 |

#### 17.12.3 이용안내 관리 `/admin/content/guide`

| 기능 | 설명 |
|---|---|
| 이용안내 섹션 관리 | 자연어 검색, 조건 추출, 자격판정, 사업계획서 생성, CSV/XLSX 내보내기 안내 |
| 단계별 가이드 편집 | 사용자 온보딩에 노출할 안내 문구 수정 |
| 이미지/동영상 링크 | 안내 콘텐츠용 이미지 또는 영상 링크 관리 |
| 공개 상태 | 공개, 비공개, 예약 게시 |

---

### 17.13 로그 관리 `/admin/logs/*`

| 로그 | 설명 |
|---|---|
| API 동기화 로그 | 공공 API 호출, 성공/실패, 저장 수 |
| LLM 로그 | 조건 추출, 문서 생성, 코멘트 생성 요청/응답 상태 |
| 결제 웹훅 로그 | 결제 승인, 실패, 환불 이벤트 처리 상태 |
| 파일 내보내기 / Google Sheets 호환 로그 | CSV/XLSX 파일 생성, 저장, 다운로드 URL, 실패 사유 |
| 오류 로그 | 서버 오류, DB 오류, 외부 API 오류 |

---

### 17.14 설정 `/admin/settings`

| 설정 | 설명 |
|---|---|
| 공공 API 환경 설정 | 키 값 자체는 저장하지 않고 연결 상태만 표시 |
| 추천 가중치 기본값 | 홈 추천/트렌딩 추천의 기본 가중치 |
| 사용량 제한 기본값 | 요금제별 검색/문서 생성/CSV/XLSX 내보내기 제한 |
| 관리자 알림 설정 | 이메일/웹 알림 대상 설정 |
| 서비스 점검 모드 | 일시 점검 배너 노출 여부 |
| LLM 모델 설정 | 사용 모델명, timeout, retry 정책 |

---

### 17.15 시스템 알림 데이터 구조

이미지 제안안의 `시스템 알림` 패널을 구현하기 위해 `system_alerts` 테이블을 추가한다.

```sql
create table system_alerts (
  id uuid primary key default gen_random_uuid(),
  alert_type text not null, -- api_sync | public_api | llm | billing | file_export | recommendation | system
  severity text not null default 'warning', -- info | warning | critical
  title text not null,
  message text,
  source text,
  related_entity_type text,
  related_entity_id uuid,
  status text not null default 'open', -- open | acknowledged | resolved | ignored
  assigned_admin_id uuid references auth.users(id),
  resolved_at timestamptz,
  created_at timestamptz default now()
);
```

#### 알림 상태값

| 상태 | 설명 |
|---|---|
| `open` | 신규 알림 |
| `acknowledged` | 관리자가 확인 |
| `resolved` | 조치 완료 |
| `ignored` | 조치 불필요로 처리 |

---

### 17.16 관리자 페이지 설계 포인트

이미지 제안안의 설계 방향을 PRD에 반영한다.

| 설계 포인트 | 설명 |
|---|---|
| 운영 중심 대시보드 | 공고, 추천, 문의, 결제, CSV/XLSX 내보내기 현황을 한눈에 파악 |
| 공고 라이프사이클 관리 | 수집, 매핑, 검수, 노출, 숨김 처리까지 관리 |
| 추천 배너 제어 | 메인 AI 추천 지원사업 슬롯을 자동/수동/캠페인 방식으로 관리 |
| 문서/콘텐츠 관리 | 약관, 개인정보처리방침, FAQ, 이용안내를 관리자에서 수정 |
| Google Sheets 호환 내보내기 | 생성 문서와 검색 결과를 CSV/XLSX 파일로 내보내고 실패 작업을 재시도 |
| 시스템 장애 대응 | API, LLM, 결제, Sheets 오류를 시스템 알림으로 통합 관리 |

---

### 17.17 관리자 페이지 MVP 우선순위

| 우선순위 | 관리자 기능 |
|---:|---|
| 1 | 관리자 공통 레이아웃, 로그인 권한, 대시보드 KPI |
| 2 | 공고 목록/상세/동기화 로그/필드 매핑 |
| 3 | 홈 추천 배너 슬롯 관리 |
| 4 | 문의/피드백 관리 |
| 5 | CSV/XLSX 내보내기 현황 및 재시도 |
| 6 | 정책문서/FAQ/이용안내 관리 |
| 7 | 사용자/결제/사용량 관리 |
| 8 | 시스템 알림, LLM 로그, 오류 로그. A/B 테스트는 v2 검토 |

---


### 17.18 관리자 내부 API와 공공 API의 역할 분리

관리자 페이지에서 사용하는 API는 외부 공공 API가 아니라 **PolicyFund AI v2 내부 운영 API**다. 공공 API는 공고 원천 데이터를 가져오는 데 사용하고, 관리자 내부 API는 Supabase에 저장된 서비스 데이터를 조회·수정·운영하는 데 사용한다.

#### 역할 구분

| 구분 | 공공 API | 관리자 내부 API |
|---|---|---|
| 소유/제공 주체 | 외부 공공기관 | PolicyFund AI v2 서비스 내부 |
| 사용 목적 | 정책자금·지원사업 공고 데이터 수집 | 관리자 화면 데이터 조회·수정·운영 |
| 주요 데이터 | 공고 목록, 공고 상세, 기관 정보, 신청기간 | KPI, 공고 상태, 추천 슬롯, 문의, 피드백, 로그, 결제, 콘텐츠 |
| 인증 방식 | 형이 보유한 공공 API 키를 서버 환경변수로 사용 | 서비스 로그인 세션 + 관리자 권한 검증 |
| 저장 위치 | 호출 후 Supabase `support_programs` 등에 저장 | Supabase 내부 테이블 직접 조회·수정 |
| 대체 가능 여부 | 관리자 내부 API를 대체할 수 없음 | 공공 API 호출을 감싸서 동기화 기능으로 제공 가능 |

#### 전체 흐름

```text
[공공 API]
기업마당 / K-Startup / 중소벤처24
        ↓
공고 데이터 수집
        ↓
[Supabase DB]
support_programs
api_sync_logs
home_recommendation_slots
customer_inquiries
feedback
file_exports
system_alerts
        ↓
[관리자 내부 API]
/api/admin/dashboard
/api/admin/programs
/api/admin/programs/sync
/api/admin/recommendations/home-slots
/api/admin/inquiries
/api/admin/feedback
/api/admin/content/*
/api/admin/system-alerts
        ↓
[관리자 화면]
대시보드 / 공고관리 / 배너관리 / 문의관리 / 콘텐츠관리 / 로그관리
```

#### 공공 API가 사용되는 관리자 기능

공공 API는 관리자 페이지 전체에 직접 연결하지 않고, 아래 기능에서만 서버 내부적으로 호출한다.

| 관리자 기능 | 공공 API 사용 여부 | 설명 |
|---|---:|---|
| 공고 수동 동기화 | 사용 | 관리자가 버튼을 누르면 서버가 공공 API를 호출해 DB에 저장 |
| 공고 재수집 | 사용 | 특정 출처·기간·키워드 기준으로 재수집 |
| 원문 데이터 확인 | 부분 사용 | DB에 저장된 `raw_content` 우선, 필요 시 원문 재조회 |
| 공고 목록 관리 | 미사용 | Supabase에 저장된 공고를 조회 |
| 홈 추천 배너 관리 | 미사용 | 내부 `home_recommendation_slots` 수정 |
| 문의/피드백 관리 | 미사용 | 내부 고객지원 데이터 조회·처리 |
| FAQ/이용안내/약관 관리 | 미사용 | 내부 콘텐츠 테이블 수정 |
| 결제/사용량 관리 | 미사용 | 내부 결제·사용량 테이블 조회 |
| 시스템 알림 관리 | 미사용 | 내부 오류·알림 테이블 조회 |

#### 관리자 내부 API 예시

| API | Method | 역할 | 공공 API 호출 여부 |
|---|---|---|---:|
| `/api/admin/dashboard` | GET | KPI 카드, 대시보드 패널 데이터 조회 | 미사용 |
| `/api/admin/programs` | GET | DB에 저장된 공고 목록 조회 | 미사용 |
| `/api/admin/programs/[id]` | GET/PATCH | 공고 상세 조회, 상태·파싱값 수정 | 미사용 |
| `/api/admin/programs/sync` | POST | 공공 API 동기화 실행 후 DB 저장 | 사용 |
| `/api/admin/recommendations/home-slots` | GET/PATCH | 홈 배너 슬롯 조회·수정 | 미사용 |
| `/api/admin/inquiries` | GET/PATCH | 문의 목록 조회·처리 상태 변경 | 미사용 |
| `/api/admin/feedback` | GET/PATCH | 피드백 조회·상태 변경 | 미사용 |
| `/api/admin/content/faqs` | GET/POST/PATCH/DELETE | FAQ 관리 | 미사용 |
| `/api/admin/content/guide` | GET/POST/PATCH/DELETE | 이용안내 관리 | 미사용 |
| `/api/admin/system-alerts` | GET/PATCH | 시스템 알림 조회·해결 처리 | 미사용 |

#### 관리자 API 보안 원칙

| 원칙 | 설명 |
|---|---|
| 관리자 권한 필수 | 모든 `/api/admin/*` 라우트는 로그인 및 관리자 role 검증 필요 |
| 공공 API 키 비노출 | 공공 API 키는 관리자 화면에도 직접 노출하지 않음 |
| 작업 이력 저장 | 공고 수정, 배너 변경, 콘텐츠 수정, 문의 상태 변경은 `admin_activity_logs`에 기록 |
| 서버 전용 호출 | 공공 API 호출은 브라우저가 아니라 서버 API Route에서만 수행 |
| 실패 로그 저장 | 공공 API 실패, DB 저장 실패, 파싱 실패는 `api_sync_logs`와 `system_alerts`에 저장 |

#### 관리자 작업 이력 테이블

```sql
create table admin_activity_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references auth.users(id),
  action_type text not null, -- create | update | delete | sync | resolve | export | login
  target_type text not null, -- program | recommendation_slot | inquiry | feedback | faq | guide | policy_document | billing | system_alert
  target_id uuid,
  before_data jsonb,
  after_data jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz default now()
);
```

---

## 18. Google Sheets 호환 내보내기 명세

### 18.1 문서 다운로드 정책 변경

v1.7부터 문서 다운로드의 기본 방식은 **Google Sheets API 직접 연동**이 아니라 **Google Sheets에서 바로 열 수 있는 CSV/XLSX 호환 내보내기**로 정의한다.

| 항목 | v1.6 이전 표현 | v1.7 최종 표현 |
|---|---|---|
| 문서 다운로드 | Google Sheets 직접 연동 중심 | Google Sheets 호환 CSV/XLSX 다운로드 중심 |
| Google API 사용 | OAuth 또는 서비스 계정 검토 | v1 기본 범위에서는 사용하지 않음 |
| 사용자 작업 | Google Drive 자동 생성 | CSV/XLSX 다운로드 후 Google Sheets에서 열기/가져오기 |
| 구현 난이도 | OAuth, 토큰 저장, 권한 관리 필요 | 서버에서 파일 생성 후 다운로드 제공 |
| 개인정보 위험 | Google 권한·공유 설정 관리 필요 | 사용자가 직접 파일을 보관·업로드 |

#### 정책 결정

```text
v1 기본:
- Google Sheets API를 사용하지 않는다.
- CSV 또는 XLSX 파일을 생성해 다운로드한다.
- 생성 파일은 Google Sheets에서 열 수 있는 형식으로 제공한다.

v2 확장:
- 사용자가 명시적으로 Google 계정을 연결하는 경우에만 CSV/XLSX 호환 파일 내보내기을 검토한다.
- 이때 OAuth, 토큰 저장, 권한 철회, Drive 저장 위치, 공유 설정을 별도 PRD로 정의한다.
```

---

### 18.2 Google API 없이 제공하는 방식

#### 방식 A. CSV 다운로드

```text
사용자 클릭
→ 서버가 CSV 생성
→ .csv 파일 다운로드
→ 사용자가 Google Sheets에서 파일 열기 또는 가져오기
```

| 장점 | 단점 |
|---|---|
| Google API, OAuth, 권한 심사 불필요 | 사용자가 직접 Google Sheets에 업로드해야 함 |
| 구현이 가장 단순함 | 여러 시트 탭·서식 표현에는 한계가 있음 |
| 검색 결과·자격판정표에 적합 | 사업계획서처럼 구조가 긴 문서는 가독성 한계 |

#### 방식 B. XLSX 다운로드

```text
사용자 클릭
→ 서버가 XLSX 생성
→ .xlsx 파일 다운로드
→ 사용자가 Google Sheets에서 열기
```

| 장점 | 단점 |
|---|---|
| 여러 시트 탭 구성 가능 | CSV보다 구현 복잡도 높음 |
| 헤더, 컬럼 폭, 메모, 상태값 등 서식 적용 가능 | Google Sheets 고유 기능은 직접 제어 불가 |
| 사업계획서 초안, 루브릭 평가표, 일정표에 적합 | 대용량 파일 처리 시 성능 관리 필요 |

#### 방식 C. 임시 CSV URL + IMPORTDATA 안내 — v1 기본 제외

```text
서버가 CSV 파일 생성
→ 임시 URL 제공
→ 사용자가 Google Sheets에서 =IMPORTDATA("CSV_URL") 사용
```

| 장점 | 단점 |
|---|---|
| Google API 없이 Google Sheets에서 데이터 불러오기 가능 | URL 접근 권한·만료 정책 필요 |
| 반복 업데이트형 데이터에 활용 가능 | 개인정보가 포함된 문서에는 기본 비추천 |

#### 기본 적용 기준

| 대상 | 기본 방식 |
|---|---|
| 검색 결과 | CSV 또는 XLSX |
| 공고 비교표 | XLSX |
| 자격판정 결과 | XLSX |
| 서류 체크리스트 | XLSX |
| 사업계획서 초안 | XLSX |
| 심사 루브릭 평가표 | XLSX |
| 일정표 | XLSX |

---

### 18.3 Export API

Google Sheets API를 직접 호출하지 않으므로, API 명칭은 `google-sheet`가 아니라 `csv`, `xlsx`로 분리한다.

#### `POST /api/export/csv`

CSV 단일 파일을 생성한다.

##### Request

```json
{
  "export_type": "search_results",
  "source_id": "search-session-uuid",
  "title": "정책자금 추천공고 검색 결과"
}
```

##### Response

```json
{
  "export_id": "export-uuid",
  "status": "success",
  "file_format": "csv",
  "download_url": "https://.../exports/search-results.csv",
  "expires_at": "2026-05-12T00:00:00+09:00",
  "created_at": "2026-05-11T00:00:00+09:00"
}
```

#### `POST /api/export/xlsx`

여러 시트 탭을 포함한 XLSX 파일을 생성한다.

##### Request

```json
{
  "export_type": "business_plan",
  "document_id": "document-uuid",
  "program_id": "program-uuid",
  "title": "정책자금 사업계획서 초안"
}
```

##### Response

```json
{
  "export_id": "export-uuid",
  "status": "success",
  "file_format": "xlsx",
  "download_url": "https://.../exports/business-plan.xlsx",
  "expires_at": "2026-05-12T00:00:00+09:00",
  "created_at": "2026-05-11T00:00:00+09:00"
}
```

---

### 18.4 XLSX 시트 구성 예시

#### 18.4.1 검색 결과 내보내기

| 시트명 | 내용 |
|---|---|
| `추천공고` | 추천 공고 목록 |
| `조건추출` | 사용자 입력 조건 |
| `자격판정` | 공고별 판정 결과 |
| `서류체크리스트` | 필수서류 목록 |
| `일정표` | 마감일 및 준비 일정 |
| `출처` | 공공 API 출처, 원문 링크, 동기화 시각 |

#### 18.4.2 사업계획서 내보내기

| 시트명 | 내용 |
|---|---|
| `요약` | 사업 개요, 지원사업명, 신청금액 |
| `P-문제인식` | 고객 문제, 시장 근거 |
| `S-실현가능성` | 솔루션, 실행계획, 기술/서비스 구현 |
| `S-성장전략` | 시장진입, 매출계획, 확장전략 |
| `T-팀구성` | 인력, 역량, 역할 |
| `루브릭평가` | 항목별 점수, 감점 사유, 보완 방향 |
| `제출서류` | 필수서류, 준비상태 |
| `출처와고지` | 데이터 출처와 법적 고지 |

---

### 18.5 Export 이력 저장

기존 `file_exports` 명칭은 기능 의미와 맞지 않으므로 v1.7에서는 `file_exports`로 변경한다.

```sql
create table file_exports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  export_type text not null, -- search_results | comparison | eligibility | checklist | business_plan | rubric | timeline
  file_format text not null, -- csv | xlsx
  source_type text, -- search_session | document | program | diagnosis
  source_id uuid,
  title text,
  storage_path text,
  download_url text,
  status text not null default 'pending', -- pending | processing | success | failed | expired
  error_message text,
  expires_at timestamptz,
  created_at timestamptz default now(),
  completed_at timestamptz
);
```

#### 관리자 화면 명칭 변경

| 기존 명칭 | v1.7 명칭 |
|---|---|
| Google Sheets 직접 내보내기 | CSV/XLSX 내보내기 |
| CSV/XLSX 내보내기 현황 | CSV/XLSX 내보내기 현황 |
| 파일 내보내기 실패 | 파일 생성 실패 |

---

### 18.6 Google Sheets API 확장 조건

v1에서는 Google Sheets API를 사용하지 않는다. 아래 조건이 충족될 경우 v2에서 선택 기능으로 검토한다.

| 조건 | 설명 |
|---|---|
| 사용자가 Google 계정 연결을 원함 | OAuth 동의 화면 필요 |
| 사용자 Drive에 자동 저장해야 함 | Google Drive/Sheets API 필요 |
| 기존 Google Sheet에 누적 저장해야 함 | Sheets API 필요 |
| 협업 공유 링크가 필요함 | Google 권한·공유 설정 필요 |
| 자동 동기화가 필요함 | 토큰 갱신, revoke 처리 필요 |

#### v2 확장 시 필요한 환경변수

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
```

서비스 계정 방식은 사용자 개인 Drive 저장이 핵심 요구사항이 될 경우 기본 방식으로 채택하지 않는다.

---

## 19. 공공 API 연동 명세

### 19.1 API 키 관리 원칙

공공 API 값은 사용자가 별도로 보유하고 있으므로, PRD에는 실제 키 값을 기록하지 않는다.  
개발 및 배포 시에는 아래 환경변수명으로 관리한다.

```env
BIZINFO_API_KEY=
KSTARTUP_API_KEY=
SME24_API_KEY=
```

공공 API 키는 공고 수집과 동기화에만 사용한다. 관리자 페이지의 조회·수정 기능은 공공 API가 아니라 Supabase 내부 데이터와 `/api/admin/*` 내부 API를 통해 처리한다.

운영 환경에서는 다음 원칙을 따른다.

| 원칙 | 설명 |
|---|---|
| 클라이언트 노출 금지 | 모든 API 키는 서버 환경변수로만 사용 |
| Vercel 환경변수 사용 | Production/Preview/Development 분리 |
| 로그 마스킹 | API 키는 로그에 출력하지 않음 |
| 재발급 대응 | 키 변경 시 재배포 없이 환경변수 교체 가능 구조 |
| 호출 제한 대응 | 실패/제한 응답 발생 시 캐시 또는 DB fallback |

---

### 19.2 공공 API 수집 대상

| 출처 | 용도 |
|---|---|
| 기업마당 | 중소기업 지원사업 공고 |
| K-Startup | 창업지원사업 공고 |
| 중소벤처24 | 중소벤처기업 관련 지원정보 |

---

### 19.3 공통 필드 매핑

| 표준 DB 필드 | 설명 | 매핑 기준 |
|---|---|---|
| `source` | 출처 | `bizinfo`, `kstartup`, `sme24` |
| `external_id` | 외부 공고 ID | API별 고유 ID |
| `title` | 공고명 | 제목 필드 |
| `organization` | 주관/소관기관 | 기관명 |
| `region` | 지역 | 전국/시도/시군구 |
| `industry` | 업종 | 공고 분류 또는 원문 파싱 |
| `support_type` | 지원 유형 | 운영자금/R&D/수출/인력 등 |
| `support_amount_min_krw` | 최소 지원금 | 원문 또는 파싱값 |
| `support_amount_max_krw` | 최대 지원금 | 원문 또는 파싱값 |
| `application_start_date` | 신청 시작일 | 접수 시작일 |
| `application_end_date` | 신청 마감일 | 접수 종료일 |
| `eligibility_text` | 신청 대상 원문 | 대상/자격 필드 |
| `exclusion_text` | 제외 대상 원문 | 제외/제한 필드 |
| `required_docs` | 필수서류 | 원문 파싱 또는 별도 필드 |
| `evaluation_items` | 평가항목 | 원문 파싱 또는 별도 필드 |
| `application_url` | 신청 URL | 원문 링크 |
| `raw_content` | 원본 데이터 | API 원문 JSON 또는 텍스트 |
| `synced_at` | 동기화 시각 | 시스템 생성 |

---

### 19.4 동기화 주기

| 수집 유형 | 주기 |
|---|---|
| 신규 공고 동기화 | 매일 1회 |
| 마감임박 공고 상태 갱신 | 매일 1회 |
| 관리자 수동 동기화 | 필요 시 |
| 실패 재시도 | 3회 재시도 후 로그 저장 |

---

### 19.5 실패 처리

| 상황 | 처리 |
|---|---|
| API 키 오류 | 관리자 로그 기록, 사용자에게 일반 오류 메시지 |
| 외부 API 장애 | 기존 Supabase 캐시 데이터 사용 |
| 응답 필드 누락 | `raw_content` 저장 후 관리자 검토 |
| 중복 공고 | `source + external_id` 우선, 제목/기관/마감일 유사도 보조 |
| 마감일 누락 | `status = unknown`, 관리자 검토 대상 |

---

## 19.6 공공 API 데이터 저장량 관리 정책 [v1.8]

공공 API 데이터는 메인 배너·검색·자격판정의 안정성을 위해 Supabase에 저장하되, 전체 원문을 무제한 저장하지 않는다. 저장량 관리는 다음 원칙을 따른다.

### 19.6.1 저장 최소화 원칙

| 원칙 | 내용 |
|---|---|
| 핵심 필드 우선 | 제목, 기관, 지역, 업종, 지원유형, 신청기간, 원문 URL 등 화면과 검색에 필요한 필드만 기본 저장 |
| 원문 선택 저장 | `raw_content`는 필수 저장값이 아니며, 파싱 실패·고노출 공고·사용자 요청 공고 중심으로 저장 |
| 첨부파일 미저장 | 첨부파일은 URL만 보관하고 기본적으로 파일 자체를 저장하지 않음 |
| 오래된 공고 archive | 마감 후 일정 기간이 지나면 `archived` 상태로 전환 |
| 기본 검색 제한 | 사용자 검색 기본값은 `active` 공고만 조회 |

### 19.6.2 권장 보관 기간

| 상태 | 보관 기준 | 사용자 기본 노출 |
|---|---|---|
| active | 현재 모집 중 | 노출 |
| closing_soon | 마감 임박 | 노출 및 추천 후보 |
| closed | 마감 후 90일 이내 | 기본 비노출, 필터 선택 시 조회 가능 |
| archived | 마감 후 90일 초과 | 관리자만 조회 |
| deleted_candidate | 장기 보관 불필요 | 삭제 검토 |

### 19.6.3 메인 배너 조회 기준

```sql
select *
from support_programs
where status = 'active'
  and visibility_status = 'visible'
  and application_end_date >= current_date
  and application_url is not null
order by recommendation_score desc, application_end_date asc
limit 10;
```

### 19.6.4 관리자 페이지의 역할

관리자 페이지는 공고 전체를 수동으로 관리하기 위한 화면이 아니라, 다음 목적에 집중한다.

```text
1. 공공 API 동기화 성공/실패 확인
2. active 공고와 오류 공고의 품질 확인
3. 원문 링크·마감일·필수 필드 누락 확인
4. 중복 의심 공고 처리
5. 추천 배너 후보 확인 및 제외/고정
6. 파싱 조건 오류 확인
7. 사용자 문의 대응을 위한 공고 상태 조회
```

---

## 20. 비기능 요구사항

### 20.1 성능 기준

| 기능 | 목표 응답 시간 |
|---|---:|
| 홈 페이지 초기 로딩 | 2초 이내 |
| 홈 추천 배너 API | 1초 이내 |
| 자연어 조건 추출 | 3초 이내 |
| 검색 결과 반환 | 10초 이내 |
| 공고 상세 조회 | 1초 이내 |
| 사업계획서 초안 생성 | 30초 이내 |
| 파일 내보내기 / Google Sheets 호환 | 15초 이내 |

---

### 20.2 모바일 대응

| 기준 | 내용 |
|---|---|
| 최소 지원 너비 | 360px |
| 기본 모바일 기준 | 390px |
| 태블릿 | 768px 이상 대응 |
| 데스크톱 | 1280px 이상 최적화 |
| 추천 카드 | 모바일에서는 세로 리스트 |
| 조건 칩 | 모바일에서는 줄바꿈 또는 가로 스크롤 |

---

### 20.3 접근성

| 항목 | 기준 |
|---|---|
| 키보드 탐색 | 주요 버튼/입력창 접근 가능 |
| 색상 대비 | 텍스트와 배경 대비 확보 |
| 폼 라벨 | 입력 필드 라벨 명확화 |
| 오류 메시지 | 색상만이 아니라 텍스트로 안내 |
| 링크 텍스트 | 목적이 드러나는 문구 사용 |

---

### 20.4 보안

| 항목 | 기준 |
|---|---|
| API 키 | 서버 환경변수로만 보관 |
| 사용자 데이터 | Supabase RLS 적용 |
| 결제 데이터 | 결제사 토큰/ID만 저장, 카드번호 저장 금지 |
| Google API/OAuth | v1 미사용. CSV/XLSX 파일 생성은 서버 내부 처리 |
| 로그 | 개인정보와 API 키 마스킹 |
| 관리자 접근 | 관리자 role 기반 제한 |

---

### 20.5 로그 보관

| 로그 | 보관 기간 |
|---|---:|
| API 호출 로그 | 90일 |
| 공공 API 동기화 로그 | 180일 |
| 결제 웹훅 로그 | 1년 |
| 오류 로그 | 180일 |
| 사용자 피드백 | 서비스 개선 목적에 따라 보관, 삭제 요청 시 처리 |

---

### 20.6 데이터 출처 표시

모든 공고 상세 화면과 파일 내보내기 / Google Sheets 호환 결과에는 다음을 표시한다.

```text
데이터 출처
원문 링크
동기화 시각
추천/판정 기준
법적 고지
```

---

### 20.7 브라우저 지원

| 브라우저 | 지원 |
|---|---|
| Chrome 최신 2개 버전 | 지원 |
| Edge 최신 2개 버전 | 지원 |
| Safari 최신 2개 버전 | 지원 |
| Firefox 최신 2개 버전 | 지원 |
| Internet Explorer | 미지원 |

---

### 20.8 장애 대응

| 장애 | 대응 |
|---|---|
| LLM API 장애 | 조건 직접 입력 모드와 DB 검색 제공 |
| 공공 API 장애 | Supabase에 저장된 최근 동기화 데이터로 검색 |
| CSV/XLSX 파일 생성 또는 다운로드 장애 | 내보내기 실패 상태 저장 후 재시도 |
| 결제사 장애 | 결제 요청 중단 및 사용자 안내 |
| Supabase 장애 | 사용자 안내 및 관리자 알림 |

---

## 21. v1.5 업데이트된 개발 단계

### Phase 1. 기본 프레임워크

- Next.js App Router 구성
- Supabase Auth/DB 연결
- 공통 레이아웃, Header/Footer
- `/about`, `/guide`, `/terms`, `/privacy`, `/disclaimer`, `/refund-policy`, `/contact`, `/faq`

### Phase 2. 자연어 검색 UX

- Hero 자연어 검색창
- `/api/query/parse`
- 조건 추출 카드
- 부족 조건 보완 UI
- 조건 필드명 표준화

### Phase 3. 공고 검색/추천

- 공공 API 연동
- Supabase `support_programs` 동기화
- `/api/search`
- `/api/programs/[id]`
- `/api/home/recommendations`
- `/api/programs/trending`

### Phase 4. 자격판정/체크리스트

- 룰 기반 자격판정
- LLM 설명 보완
- 서류 체크리스트
- 일정표 생성

### Phase 5. 사업계획서/루브릭

- PSST 기반 사업계획서 초안
- 루브릭 기반 평가
- 보완 코멘트
- 생성 문서 저장

### Phase 6. 파일 내보내기 / Google Sheets 호환

- CSV/XLSX 호환 파일 내보내기
- 검색 결과 내보내기
- 사업계획서 내보내기
- 자격판정/서류/일정표 시트 생성
- 내보내기 이력 관리

### Phase 7. 관리자 페이지

- 관리자 대시보드
- 공고 동기화 관리
- 추천 배너 슬롯 관리
- 문의/피드백 관리
- 약관/정책 문서 관리

### Phase 8. 결제/사용량

- 요금제
- 결제 연동
- 사용량 제한
- 구독/환불 관리



---

## 21. v1.9 개발 착수용 정리

### 21.1 v1에서 확정한 원칙

| 구분 | v1 확정 방향 |
|---|---|
| 공공 API | 사용자가 보유한 API 키를 서버 환경변수에 등록해 사용 |
| 공고 노출 | 공공 API를 홈 화면에서 실시간 직접 호출하지 않고, DB에 저장된 정제 데이터를 사용 |
| 검색 | LLM 검색 금지. DB 검색, 필터링, 정렬, 룰 기반 추천점수 사용 |
| 자격판정 | 룰 기반 1차 판정 후 LLM은 설명 문구 보완만 수행 |
| 사업계획서 초안 | LLM 중심 생성 가능. 단, 입력 데이터와 공고 원문 근거를 명시 |
| 심사 점수 예측 | 루브릭 점수화 + LLM 코멘트 방식 |
| 문서 내보내기 | Google Sheets API 미사용. CSV/XLSX 다운로드로 Google Sheets 호환 제공 |
| 관리자 페이지 | 공고 전체 수동 CMS가 아니라 데이터 품질관리·동기화·노출 제어 콘솔 |

### 21.2 v1에서 제거 또는 v2로 이동하는 범위

| 항목 | v1 처리 | 이유 |
|---|---|---|
| Google Sheets API 직접 생성 | v2 이동 | v1은 CSV/XLSX 다운로드로 충분 |
| Google OAuth / Drive 저장 | v2 이동 | 권한 동의, 토큰 저장, 보안 검토 필요 |
| Sheet ID / Sheet URL 저장 | 삭제 | v1에서는 실제 Google Sheet를 생성하지 않음 |
| IMPORTDATA 방식 | v1 기본 제외 | CSV URL 노출에 따른 개인정보·기업정보 위험 |
| 공고 전체 수동 등록 CMS | 축소 | 공고 원천은 공공 API이며 관리자는 QA와 노출 제어 중심 |
| A/B 테스트 | v2 이동 | 초기 핵심 흐름에 필수 아님 |
| 수혜 이력 관리 | v2 이동 | 추천 이후 사후관리 기능에 해당 |
| 결제/구독 | v1 핵심에서 분리 가능 | 초기 검증은 무료/관리자 제한 사용량으로 가능 |

### 21.3 최종 `support_programs.status` 상태값

`support_programs.status`는 아래 값만 사용한다.

| 상태값 | 의미 | 기본 검색 노출 | 메인 배너 후보 |
|---|---|---:|---:|
| `active` | 신청 가능 | 예 | 예 |
| `closing_soon` | 마감 임박 | 예 | 예 |
| `closed` | 마감 | 기본 제외 | 아니오 |
| `archived` | 보관 처리 | 제외 | 아니오 |
| `hidden` | 관리자 숨김 | 제외 | 아니오 |
| `error` | 데이터 오류 | 제외 | 아니오 |
| `duplicate_suspected` | 중복 의심 | 제외 | 아니오 |
| `deleted_candidate` | 삭제 후보 | 제외 | 아니오 |

메인 추천 배너 조회 조건은 아래와 같다.

```sql
where status in ('active', 'closing_soon')
  and visibility_status = 'visible'
  and application_end_date >= current_date
  and application_url is not null
```

### 21.4 검색 세션 저장 테이블

검색 결과를 CSV/XLSX로 다시 내보내거나, 사용자의 과거 검색 조건을 재현하기 위해 검색 세션을 저장한다.

```sql
create table search_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  natural_language_query text,
  extracted_conditions jsonb,
  confirmed_conditions jsonb,
  applied_filters jsonb,
  sort text default 'recommendation_score',
  result_count int default 0,
  created_at timestamptz default now()
);
```

```sql
create table search_session_results (
  id uuid primary key default gen_random_uuid(),
  search_session_id uuid references search_sessions(id) on delete cascade,
  program_id uuid references support_programs(id),
  recommendation_score numeric,
  eligibility_status text, -- likely_eligible | review_needed | likely_ineligible | unknown
  rank_order int,
  created_at timestamptz default now()
);
```

### 21.5 룰 기반 자격판정 엔진 명세

LLM은 자격판정 상태값을 직접 결정하지 않는다. 판정 상태는 룰 엔진이 계산하고, LLM은 사용자에게 보여줄 설명 문구를 보완한다.

#### 21.5.1 룰 구조

```json
{
  "field": "business_age_years",
  "operator": "<=",
  "value": 7,
  "required": true,
  "rule_type": "required_condition",
  "source_clause": "창업 후 7년 이내 기업"
}
```

| 필드 | 설명 |
|---|---|
| `field` | 비교 대상 표준 필드명 |
| `operator` | `=`, `!=`, `>`, `>=`, `<`, `<=`, `in`, `not_in`, `contains` |
| `value` | 비교값 |
| `required` | 필수 조건 여부 |
| `rule_type` | `required_condition`, `exclusion_condition`, `preference_condition` |
| `source_clause` | 공고 원문에서 추출한 근거 문장 |

#### 21.5.2 판정 우선순위

| 우선순위 | 조건 | 결과 |
|---:|---|---|
| 1 | 제외 조건에 명확히 해당 | `likely_ineligible` |
| 2 | 필수 조건 중 하나라도 명확히 불충족 | `likely_ineligible` |
| 3 | 필수 조건 대부분 충족, 일부 정보 누락 | `review_needed` |
| 4 | 필수 조건 모두 충족 | `likely_eligible` |
| 5 | 공고 조건 파싱 실패 또는 사용자 정보 부족 | `unknown` |

#### 21.5.3 사용자 정보 부족 처리

| 상태 | 처리 |
|---|---|
| 사용자가 모름 선택 | `unknown`으로 저장하고 판정은 `review_needed` 또는 `unknown` |
| 핵심 조건 누락 | 판정 결과에 “추가 확인 필요” 표시 |
| 낮은 신뢰도 추출 | 조건 확인 카드에서 사용자 확인 요구 |

### 21.6 심사 점수 예측 루브릭 v1

심사 점수 예측은 고정 루브릭 기반으로 계산하고, LLM은 항목별 보완 코멘트만 생성한다.

| 평가 항목 | 배점 | 주요 확인 기준 |
|---|---:|---|
| 문제인식 | 25 | 해결하려는 문제, 고객 불편, 시장 필요성이 구체적인가 |
| 실현가능성 | 25 | 실행계획, 일정, 예산, 인력 계획이 현실적인가 |
| 성장전략 | 25 | 시장확장, 수익모델, 판로, 확장 가능성이 있는가 |
| 팀/수행역량 | 15 | 대표자·팀의 경험, 전문성, 수행 이력이 있는가 |
| 정책 적합성 | 10 | 해당 지원사업의 목적과 신청 내용이 맞는가 |
| 합계 | 100 |  |

#### 21.6.1 감점 기준

| 감점 항목 | 감점 예시 |
|---|---:|
| 시장 규모 또는 고객 근거 없음 | -5 ~ -10 |
| 실행 일정이 모호함 | -5 |
| 예산 사용 계획이 불명확함 | -5 ~ -10 |
| 공고 목적과 사업계획서 방향이 어긋남 | -10 ~ -20 |
| 팀 역량 근거 부족 | -5 |

#### 21.6.2 결과 구간

| 점수 | 해석 |
|---:|---|
| 90 이상 | 매우 우수. 제출 전 문장 다듬기 중심 |
| 80~89 | 우수. 일부 근거 보강 필요 |
| 70~79 | 보통. 핵심 항목 보강 필요 |
| 60~69 | 미흡. 구조 재작성 권장 |
| 60 미만 | 제출 전 전면 보완 필요 |

### 21.7 공공 API별 수집 명세표 작성 위치

사용자가 공공 API 키를 보유하고 있으므로 PRD에는 키 발급 절차가 아니라, 실제 개발자가 구현할 수 있는 수집 명세표를 추가해야 한다. API별 아래 항목을 채운다.

| 항목 | 설명 |
|---|---|
| API명 | 기업마당, K-Startup, 중소벤처24 등 |
| Endpoint | 실제 호출 URL |
| 인증 방식 | 서비스키, 헤더, 쿼리파라미터 등 |
| 요청 파라미터 | 페이지, 기간, 키워드, 지역, 분야 등 |
| 응답 필드 | 제목, 기관, 마감일, URL, 지원금액 등 |
| 페이지네이션 | page/size, numOfRows/pageNo 등 |
| 에러 응답 | 실패 코드, 메시지 필드 |
| 호출 제한 | 1일/1초 제한이 있는 경우 기록 |
| DB 매핑 | `support_programs` 표준 필드와 연결 |

### 21.8 관리자 페이지 최종 역할 정의

관리자 페이지의 공고 관련 메뉴는 “공고 데이터 품질관리”로 정의한다. 관리자는 모든 공고를 직접 입력·수정하는 운영자가 아니라, 공공 API로 수집된 데이터가 사용자 화면에 안전하게 노출될 수 있는지 확인하는 운영자다.

관리자 공고 화면에서 허용하는 주요 작업은 아래로 제한한다.

| 작업 | 허용 여부 |
|---|---:|
| 공공 API 수동 동기화 실행 | 허용 |
| 동기화 실패 로그 확인 | 허용 |
| 파싱 실패 공고 확인 | 허용 |
| 중복 의심 공고 숨김 처리 | 허용 |
| 원문 URL 오류 공고 제외 처리 | 허용 |
| 메인 배너 고정/제외 | 허용 |
| 공고 원문 전체 수동 작성 | v1 제외 |
| 모든 공고를 CMS처럼 수동 편집 | v1 제외 |

### 21.9 API Route 최종 정리 원칙

API Route 문서는 다음 기준으로 재정리한다.

| API 구분 | 역할 |
|---|---|
| `/api/query/parse` | 자연어에서 조건 추출 |
| `/api/search` | DB 기반 검색·필터·정렬 |
| `/api/programs/[id]` | 공고 상세 조회 |
| `/api/eligibility/check` | 룰 기반 자격판정 |
| `/api/documents/generate` | 사업계획서·체크리스트·타임라인 생성 |
| `/api/export/csv` | CSV 파일 생성 |
| `/api/export/xlsx` | XLSX 파일 생성 |
| `/api/admin/*` | 관리자 내부 운영 API |
| `/api/sync/*` | 공공 API 동기화 실행 |

v1에서는 `/api/export/google-sheet`를 사용하지 않는다.


---

## 22. v2.0 무료 플랜 운영 기준 및 DB 중심 전환 설계

### 22.1 v2.0 반영 목적

본 프로젝트 v1 운영은 **Vercel Hobby Plan + Supabase Free Plan**을 기준으로 한다. 따라서 초기 운영 구조는 대용량 DB 누적 저장 방식이 아니라, **공공 API 조회 + Supabase 최소 캐시 + 룰 기반 필터링 + LLM 보조 생성** 구조로 설계한다.

동시에 향후 유료 플랜 또는 상용 운영 전환 시, 기존 코드를 대규모로 갈아엎지 않고 **관리자 설정에서 운영 모드만 전환하면 DB 중심 서비스로 확장할 수 있도록** 데이터 모델과 관리자 설정을 미리 준비한다.

### 22.2 공식 무료 플랜 기준

#### 22.2.1 Vercel Hobby 기준

Vercel 공식 문서 기준 Hobby Plan은 개인 프로젝트와 소규모 앱을 위한 무료 플랜이며, 비상업적 개인 사용으로 제한된다. Hobby Plan의 주요 한도는 아래와 같다.

| 항목 | Hobby Plan 기준 |
|---|---:|
| 프로젝트 수 | 200개 |
| Function Invocations | 월 1,000,000회 |
| Function Duration | 월 100 GB-hours |
| Active CPU | 월 4 CPU-hours |
| Provisioned Memory | 월 360 GB-hours |
| Edge Requests | 월 1,000,000회 |
| ISR Reads | 월 1,000,000회 |
| ISR Writes | 월 200,000회 |
| Build Execution Minutes | 월 6,000분 |
| 배포 횟수 | 하루 100회 |
| 도메인 수 | 프로젝트당 50개 |
| Web Analytics Events | 월 50,000건 |
| Runtime Logs | 1시간, 최대 4,000 rows |
| Vercel Function 최대 실행 시간 | 기본 10초, 최대 60초까지 설정 가능 |

**PRD 반영 원칙**

| 항목 | 반영 내용 |
|---|---|
| 서버 처리 | 무거운 장기 배치 작업은 Vercel Function에서 직접 처리하지 않음 |
| 동기화 | 공공 API 전체 재수집은 관리자 수동 또는 제한된 주기로만 실행 |
| 로그 | 장기 런타임 로그 보관을 Vercel에 의존하지 않고 필요한 오류만 DB에 저장 |
| 상용 운영 | Hobby는 검증용으로 사용하고, 상업적 운영 전 Pro 전환 검토 |

#### 22.2.2 Supabase Free 기준

Supabase 공식 문서 기준 Free Plan은 시작 및 탐색용 플랜이며, 무료 프로젝트 2개가 제공된다. 주요 한도는 아래와 같다.

| 항목 | Supabase Free 기준 |
|---|---:|
| 무료 프로젝트 수 | 2개 |
| Database Size | 프로젝트당 500MB |
| Disk Space | 1GB |
| Storage Size | 1GB |
| Egress | 5GB |
| Monthly Active Users | 50,000 MAU |
| Third-party MAU | 50,000 MAU |
| Edge Function Invocations | 월 500,000회 |
| Realtime Message Count | 월 2,000,000건 |
| Realtime Peak Connections | 200개 |
| Storage Image Transform | Free Plan 불가 |

Supabase 공식 문서 기준 Free Plan 프로젝트는 **Database Size 500MB 초과 시 read-only 모드가 트리거될 수 있다.** 따라서 본 프로젝트 v1에서는 DB에 공공 API 전체 원문을 누적 저장하지 않는다.

**PRD 반영 원칙**

| 항목 | 반영 내용 |
|---|---|
| DB 저장량 | 500MB 이하 유지를 전제로 설계 |
| 공고 데이터 | 전체 원문 누적 저장 금지 |
| 첨부파일 | Supabase Storage에 원본 저장 금지, 원문 URL만 저장 |
| 내보내기 파일 | CSV/XLSX 임시 생성 후 자동 삭제 |
| 장기 보관 | 사업계획서 초안·검색 결과·파일 이력은 제한 보관 |

### 22.3 v1 기본 운영 모드: 공공 API 조회 + 최소 캐시

v1 기본 운영 모드는 `api_minimal_cache`로 정의한다.

```text
운영 모드: api_minimal_cache
목적: Vercel Hobby + Supabase Free 한도 내에서 안정적으로 작동
핵심: 공공 API 데이터를 전부 저장하지 않고, 서비스 작동에 필요한 최소 데이터만 Supabase에 저장
```

#### 22.3.1 기본 데이터 흐름

```text
사용자 자연어 입력
→ 조건 추출
→ 공공 API 또는 최신 최소 캐시 데이터 조회
→ 필요한 항목만 Supabase에 임시/최소 저장
→ DB 검색·필터링
→ 룰 기반 자격판정
→ LLM 설명 보완
→ 결과 표시
```

#### 22.3.2 저장 대상

| 데이터 | v1 저장 여부 | 보관 정책 |
|---|---:|---|
| 공고 제목 | 저장 | 검색/노출용 최소 필드 |
| 공고 출처 | 저장 | 기업마당/K-Startup/중소벤처24 등 |
| 원문 URL | 저장 | 상세 확인용 |
| 신청 시작일/마감일 | 저장 | 마감 필터링용 |
| 기관명 | 저장 | 출처 신뢰도 표시용 |
| 지역/업종/지원유형 | 저장 | 검색 필터링용 |
| 지원금액 요약 | 선택 저장 | API 응답에 명확히 있을 때만 |
| 원문 전체 HTML | 기본 미저장 | DB 중심 모드에서만 선택 저장 |
| 첨부파일 원본 | 미저장 | URL만 보관 |
| 공고 이미지 | 미저장 | URL만 보관 |
| 사용자 사업계획서 원문 | 제한 저장 | 사용자 저장 요청 시에만 보관 |
| CSV/XLSX 파일 | 임시 저장 | 만료 후 삭제 |

#### 22.3.3 메인 추천 배너 데이터 기준

메인에 노출되는 **AI 추천 지원사업 배너**는 공공 API 기반 실제 공고만 사용한다. 단, 홈 접속 때마다 모든 공공 API를 직접 호출하지 않고, 아래 우선순위로 데이터를 구성한다.

| 우선순위 | 데이터 소스 | 설명 |
|---:|---|---|
| 1 | 최근 최소 캐시 | 최근 동기화된 active 공고 |
| 2 | 관리자 고정 배너 슬롯 | 관리자가 고정한 공고 ID |
| 3 | 공공 API 부분 조회 | 캐시가 비어 있거나 만료된 경우 제한 조회 |

배너 노출 조건은 아래로 제한한다.

```text
status in ('active', 'closing_soon')
visibility_status = 'visible'
application_end_date >= today
source_url is not null
is_duplicate_suspected = false
sync_status != 'error'
```

### 22.4 무료 플랜 기준 제한 정책

#### 22.4.1 동기화 제한

| 항목 | v1 정책 |
|---|---|
| 기본 동기화 | 하루 1회 이하 |
| 관리자 수동 동기화 | 1시간 1회 또는 1일 3회 제한 |
| 전체 재수집 | 기본 비활성화, 관리자 수동 실행만 허용 |
| 검색 시 실시간 API 호출 | 허용하되 결과 저장은 최소화 |
| 대량 원문 수집 | v1 제외 |

#### 22.4.2 파일 내보내기 제한

| 항목 | v1 정책 |
|---|---|
| 기본 포맷 | CSV |
| 선택 포맷 | XLSX |
| Google Sheets API | v1 미사용 |
| Google OAuth | v1 미사용 |
| Drive 자동 저장 | v1 미사용 |
| 파일 보관 | 임시 보관 |
| 만료 기준 | 24시간 또는 7일 중 운영 설정값 적용 |

#### 22.4.3 LLM 사용 제한

| 기능 | v1 LLM 역할 |
|---|---|
| 공고 검색 | 직접 검색하지 않음 |
| 조건 추출 | 자연어를 구조화된 조건으로 변환 |
| 자격판정 | 최종 상태값 결정하지 않음 |
| 자격판정 설명 | 룰 결과를 바탕으로 설명 보완 |
| 사업계획서 | 초안 생성 중심 |
| 심사 점수 예측 | 루브릭 점수 계산 후 코멘트 보완 |

### 22.5 DB 중심 서비스 전환 준비

향후 유료 플랜 또는 상용 운영 단계에서는 `db_centric` 모드로 전환할 수 있도록 설계한다.

```text
현재 v1 모드: api_minimal_cache
향후 전환 모드: db_centric
전환 방식: 관리자 페이지의 운영 모드 설정 변경
```

#### 22.5.1 운영 모드 정의

| 모드 | 설명 | 사용 시점 |
|---|---|---|
| `api_minimal_cache` | 공공 API 조회 + 최소 캐시 저장 | Vercel/Supabase 무료 플랜 |
| `db_centric` | 공공 API 데이터를 정기 수집해 DB 중심 검색 수행 | 유료 플랜 또는 상용 운영 |

#### 22.5.2 원클릭 전환을 위한 관리자 설정

관리자 페이지에 **운영 모드 설정**을 추가한다.

```text
관리자 > 시스템 설정 > 데이터 운영 모드
[현재 모드] api_minimal_cache
[전환 가능 모드] db_centric
[전환 버튼] DB 중심 모드로 전환
```

전환 버튼 클릭 시 시스템은 아래 조건을 확인한다.

| 확인 항목 | 조건 |
|---|---|
| Supabase Plan | Free 초과 저장이 예상되면 경고 표시 |
| DB 사용량 | 현재 Database Size 확인 |
| 필수 테이블 | `support_programs`, `program_sync_logs`, `program_snapshots` 존재 확인 |
| 인덱스 | 검색용 인덱스 존재 확인 |
| 동기화 설정 | 전체/증분 동기화 주기 설정 여부 확인 |
| 관리자 확인 | 전환 전 최종 확인 필요 |

#### 22.5.3 전환 시 동작

```text
1. 관리자 전환 버튼 클릭
2. 시스템 사전 점검 실행
3. DB 용량·필수 테이블·인덱스·동기화 설정 확인
4. 문제가 없으면 system_settings.data_mode = 'db_centric' 저장
5. 이후 검색 API는 공공 API 직접 조회보다 DB 검색을 우선 사용
6. 공공 API는 정기 동기화/증분 업데이트 용도로 사용
```

### 22.6 원클릭 전환을 위한 DB 설계 추가

#### 22.6.1 `system_settings`

```sql
system_settings
- id
- setting_key
- setting_value
- description
- updated_by
- updated_at
```

필수 설정값:

| setting_key | 기본값 | 설명 |
|---|---|---|
| `data_mode` | `api_minimal_cache` | 데이터 운영 모드 |
| `sync_interval` | `daily` | 공공 API 동기화 주기 |
| `export_file_ttl_hours` | `24` | 내보내기 파일 만료 시간 |
| `max_manual_sync_per_day` | `3` | 관리자 수동 동기화 제한 |
| `store_raw_content` | `false` | 공고 원문 전체 저장 여부 |

#### 22.6.2 `program_sync_logs`

```sql
program_sync_logs
- id
- source_name
- sync_type -- partial | full | manual
- status -- success | partial_success | failed
- requested_count
- inserted_count
- updated_count
- skipped_count
- error_count
- error_message
- started_at
- completed_at
- created_by
```

#### 22.6.3 `program_snapshots`

DB 중심 모드에서 공고 변경 이력을 보관하기 위한 선택 테이블이다. v1 무료 플랜에서는 기본 비활성화한다.

```sql
program_snapshots
- id
- program_id
- source_name
- source_program_id
- snapshot_type -- created | updated | closed | archived
- changed_fields
- created_at
```

#### 22.6.4 `program_raw_contents`

공고 원문 전체 저장이 필요한 경우에만 사용하는 선택 테이블이다. v1 무료 플랜에서는 기본 비활성화한다.

```sql
program_raw_contents
- id
- program_id
- raw_text
- raw_html
- attachment_text
- created_at
```

### 22.7 검색 API 모드 분기

`/api/search`는 운영 모드에 따라 조회 전략을 다르게 사용한다.

| 운영 모드 | 검색 우선순위 |
|---|---|
| `api_minimal_cache` | 최소 캐시 DB → 필요 시 공공 API 제한 조회 → 결과 최소 저장 |
| `db_centric` | Supabase DB 검색 → 부족한 경우 공공 API 증분 조회 |

```text
/api/search
→ system_settings.data_mode 확인
→ api_minimal_cache이면 최소 캐시 기반 검색
→ db_centric이면 support_programs DB 중심 검색
```

### 22.8 관리자 페이지 반영 사항

관리자 페이지에 아래 메뉴를 추가한다.

| 메뉴 | 기능 |
|---|---|
| 시스템 설정 | 데이터 운영 모드 확인/전환 |
| DB 사용량 | Supabase DB 사용량 수동 입력 또는 관리자 확인값 기록 |
| 동기화 설정 | 하루 1회, 수동 제한, 전체 재수집 여부 설정 |
| 캐시 관리 | 만료된 최소 캐시 삭제 |
| DB 중심 전환 점검 | 필수 테이블·인덱스·설정 확인 |

관리자 공고 품질관리 화면은 운영 모드에 따라 표시 범위를 다르게 한다.

| 모드 | 공고 화면 표시 기준 |
|---|---|
| `api_minimal_cache` | 최근 캐시, 배너 후보, 오류/중복 의심 공고 중심 |
| `db_centric` | 전체 active 공고, archive 공고, 변경 이력, 파싱 상태까지 표시 |

### 22.9 v1에서 제외하고 v2로 이동할 항목

| 항목 | v1 처리 | v2/상용 처리 |
|---|---|---|
| 공공 API 전체 원문 저장 | 제외 | DB 중심 모드에서 선택 활성화 |
| 첨부파일 원본 저장 | 제외 | 필요 시 Storage 또는 외부 저장소 검토 |
| 사업계획서 장기 보관 | 제한 | 사용자 문서함 기능으로 확장 |
| Google Sheets API 직접 생성 | 제외 | Google OAuth 도입 시 검토 |
| 결제/구독 | 제외 또는 비활성 | 상용 운영 시 도입 |
| A/B 테스트 | 제외 | 트래픽 확보 후 도입 |
| 수혜 이력 관리 | 제외 | 사후관리 모듈로 확장 |
| 전체 공고 CMS 편집 | 제외 | DB 중심 운영 시 제한적 허용 |

### 22.10 최종 운영 구조

#### v1 무료 플랜 구조

```text
Vercel Hobby
├── Next.js Frontend
├── API Routes
│   ├── 자연어 조건 추출
│   ├── 공공 API 제한 조회
│   ├── 최소 캐시 검색
│   ├── 룰 기반 자격판정
│   └── CSV/XLSX 임시 생성
└── Supabase Free
    ├── 사용자 정보
    ├── 검색 세션
    ├── 최소 공고 캐시
    ├── 추천 배너 설정
    ├── 관리자 설정
    └── 오류 로그
```

#### 향후 DB 중심 구조

```text
Vercel Pro 또는 상용 운영 환경
├── Next.js Frontend
├── API Routes
│   ├── DB 중심 검색
│   ├── 정기 동기화 제어
│   ├── 룰 기반 자격판정
│   ├── 사업계획서 생성
│   └── 관리자 운영 API
└── Supabase Pro 또는 확장 DB
    ├── 전체 active 공고
    ├── 최근 archive 공고
    ├── 공고 변경 이력
    ├── 파싱 조건
    ├── 사용자 문서함
    ├── 파일 내보내기 이력
    └── 운영 로그
```

### 22.11 문서 기준 출처

| 항목 | 기준 출처 |
|---|---|
| Vercel Hobby Plan 한도 | Vercel 공식 Hobby Plan 문서 |
| Vercel 배포·빌드 제한 | Vercel 공식 Limits 문서 |
| Supabase Free Plan 한도 | Supabase 공식 Billing 문서 |
| Supabase Database Size/read-only 기준 | Supabase 공식 Database Size 문서 |

### 22.12 v2.0 결정 사항 요약

| 결정 항목 | 최종 결정 |
|---|---|
| 현재 운영 전제 | Vercel Hobby + Supabase Free |
| 현재 데이터 전략 | 공공 API 조회 + 최소 캐시 |
| 현재 검색 방식 | LLM 검색 금지, DB/공공 API 조건 검색 |
| 현재 저장 정책 | 공고 전체 원문 저장 금지 |
| 현재 파일 내보내기 | CSV 기본, XLSX 선택, Google API 미사용 |
| 관리자 페이지 | 공고 품질관리 + 운영 모드 설정 |
| 향후 확장 | DB 중심 모드를 원클릭 전환 구조로 준비 |
| 상용 운영 | 무료 플랜 검증 후 유료 전환 검토 |
