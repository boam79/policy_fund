# PolicyFund AI v2

> 실제 공공 데이터 기반으로 정부지원사업을 검색·매칭하고, AI가 자격판정·서류체크리스트·사업계획서 초안까지 제공하는 정책자금 특화 웹서비스

**저장소 버전**: `0.2.0`  
**PRD**: PF-WEB-001 v2.0 (2026-05-11)  
**진행 상황**: [.cursor/scratchpad.md](.cursor/scratchpad.md)

---

## 기술 스택

| 구분 | 기술 |
|---|---|
| Framework | Next.js 16 (App Router · TypeScript) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Database / Auth | Supabase (PostgreSQL · RLS) |
| 배포 | Vercel Hobby Plan |
| LLM | Claude (Anthropic) — 서버 전용 |
| 공공 API | 기업마당 · K-Startup · 중소벤처24 |

---

## 로컬 설정

```bash
# 1. 의존성 설치
npm install

# 2. 환경변수 설정
cp .env.example .env.local
# .env.local에 실제 값 입력 (아래 환경변수 목록 참고)

# 3. 개발 서버 실행
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 접속

---

## 필수 환경변수

`.env.local`에 아래 값을 채워야 합니다. **절대 커밋하지 마세요.**

| 변수 | 설명 | 서버 전용 |
|---|---|---|
| `BIZINFO_API_KEY` | 기업마당 API 키 | ✅ |
| `PUBLIC_DATA_SERVICE_KEY` | 공공데이터포털 서비스키 | ✅ |
| `SMES24_API_KEY` | 중소벤처24 API 키 | ✅ |
| `ANTHROPIC_API_KEY` | Claude API 키 | ✅ |
| `SUPABASE_URL` | Supabase 프로젝트 URL | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role 키 | ✅ |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL (공개) | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anon 키 (공개) | |
| `CRON_SECRET` | 공고 동기화 Cron 보호 키 | ✅ |

---

## 프로젝트 구조

```
policy_fund/
├── app/                    # Next.js App Router 페이지
│   ├── page.tsx            # 홈 (자연어 검색 + 추천 배너)
│   ├── diagnosis/          # 조건 확인 · 보완
│   ├── search/             # 공고 검색 결과
│   ├── documents/plan/     # 사업계획서 생성
│   ├── evaluate/           # 심사 점수 예측
│   ├── admin/              # 관리자 콘솔
│   └── api/                # API Routes (서버 전용)
├── components/
│   ├── layout/             # Header, Footer
│   └── ui/                 # shadcn/ui 컴포넌트
├── lib/
│   ├── supabase/           # Supabase 클라이언트 (client/server/admin)
│   ├── gov-support/        # 공공 API 클라이언트 + 룰 엔진
│   ├── llm/                # Claude API 래퍼
│   └── query/              # 자연어 조건 추출
└── types/                  # 공통 TypeScript 타입
```

---

## 데이터 운영 모드

| 모드 | 설명 | 현재 |
|---|---|---|
| `api_minimal_cache` | 공공 API + 최소 Supabase 캐시 | ✅ **현재** |
| `db_centric` | DB 중심 검색 (유료 플랜 전환 후) | 준비 중 |

관리자 페이지 > 시스템 설정에서 원클릭 전환 가능하도록 설계됨.

---

## 개발 단계 (Phase)

| Phase | 내용 | 상태 |
|---|---|---|
| 1 | 프로젝트 기반 구축 (Next.js · Supabase · 배포) | ✅ **완료** |
| 2 | DB 스키마 구축 (20+ 테이블 · RLS) | 🔜 다음 |
| 3 | 자연어 검색 UX | ⬜ |
| 4 | 공고 동기화 + 추천 배너 | ⬜ |
| 5 | 공고 검색 + 자격판정 | ⬜ |
| 6 | 서류·타임라인·사업계획서 생성 | ⬜ |
| 7 | 심사 점수 예측 + CSV/XLSX 내보내기 | ⬜ |
| 8 | 운영 필수 페이지 + 관리자 MVP | ⬜ |
| 9 | 인증·마이페이지 | ⬜ |
| 10 | 결제·구독 (후순위) | ⬜ |

---

## 법적 고지

본 서비스의 자격판정 및 추천 결과는 공고 원문과 사용자 입력 정보를 바탕으로 한 **참고용 분석**입니다.  
실제 신청 가능 여부와 선정 여부는 각 주관기관의 최종 심사 기준에 따라 달라질 수 있습니다.  
본 서비스는 정책자금 선정 또는 지원금 수령을 보장하지 않습니다.

---

## 변경 이력

### 0.2.0 — 2026-05-15

- Next.js 16 (App Router · TypeScript · Tailwind v4) 스캐폴딩
- shadcn/ui 초기화 (Button · Card · Input · Badge 등 13개 컴포넌트)
- Supabase 프로젝트 생성 (`policyfund-ai-v2`, ap-northeast-2)
- `lib/supabase/client.ts`, `server.ts`, `admin.ts` 구현
- 공통 Header · Footer 레이아웃 구현
- 홈 화면 UI 구현 (자연어 검색창 · 추천 배너 플레이스홀더 · 4단계 흐름 · CTA)
- 전체 21개 페이지 플레이스홀더 생성
- README.md 재작성 (PRD v2.0 기준)

### 0.1.1 — 2026-05-09

- README에 버전 정책 및 변경 이력 섹션 추가

### 0.1.0 — 2026-05-09

- Git 저장소 초기화, `.env.example`, `.gitignore`, scratchpad 초기 커밋

---

## 라이선스

추후 명시
