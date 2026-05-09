# PolicyFund AI v2

정책자금·정부지원 공고 매칭 및 진단 웹앱(Next.js·Vercel·Supabase) 신규 구축 레포입니다.

**저장소 메타 버전**: `0.1.1` (아래 [변경 이력](#변경-이력) 참고)

- 제품 요구사항 원본: 로컬 보관 PRD `policyfund_v2_prd.md`(PF-WEB-001, v1.0)를 기준으로 함.
- 진행 상황·Planner/Executor 작업 보드: [.cursor/scratchpad.md](.cursor/scratchpad.md)

## 로컬 설정

1. `cp .env.example .env.local` 후 키 입력.
2. 앱 스캐폴딩은 아직 없음 — `.cursor/scratchpad.md`의 Phase 1을 따름.

## 버전 정책

| 구분 | 규칙 |
|------|------|
| README·레포 메타 | [Semantic Versioning 2.0.0](https://semver.org/lang/ko/) — 앱 미출시 구간은 `0.MINOR.PATCH`. |
| PRD·제품 문서 | 문서 헤더 버전(예: PF-WEB-001 v1.0)을 따름. |
| 배포 앱 | Vercel 배포·Git 태그 도입 후 동일 규칙으로 릴리즈 노트를 맞춤. |

`PATCH`: 문서·설정·버그 수정. `MINOR`: 스캐폴딩 완료·기능 단위(Phase) 마일스톤. `MAJOR`: 호환성 깨지는 API·데이터 마이그레이션(출시 후).

## 변경 이력

### 0.1.1 — 2026-05-09

- `README.md`에 버전 정책 및 변경 이력(버전 히스토리) 섹션 추가.

### 0.1.0 — 2026-05-09

- 빈 GitHub 원격 저장소에 초기 트리 반영 후 `main` 브랜치 푸시.
- [.cursor/scratchpad.md](.cursor/scratchpad.md): PolicyFund AI v2 Planner 보드(P0 라우트·`CompanyProfile` 8필드 확정 반영).
- [.env.example](.env.example): PRD §10 정렬 환경 변수 템플릿(비밀 값 없음).
- [.gitignore](.gitignore): Node·Next·환경 파일 등 무시 규칙.
- 스크래치패드 Executor 피드백에 초기 푸시 기록 추가.
- 참고 커밋: `ef7f9bf`(초기 계획·템플릿), `e6f2cec`(Executor 피드백 보강).

### 미배포 · 예정

- **0.2.x**(예정): Phase 1 — Next.js(App Router)·TS·Tailwind 스캐폴딩, 홈·`/diagnosis` 플레이스홀더.
- 상세 Phase 정의는 스크래치패드의 High-level Task Breakdown을 따름.

## 라이선스

추후 명시.
