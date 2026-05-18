# Phase 14-1 — 사업자 진위확인 API 스파이크

**작성**: 2026-05-17 (Executor)  
**키**: 공공데이터포털 **일반 인증키** → 지원둥지 `PUBLIC_DATA_SERVICE_KEY` (K-Startup과 동일)

## 1. 사용 API (1종, 엔드포인트 2개)

| 구분 | 공공데이터포털 |
|------|----------------|
| 서비스명 | [국세청_사업자등록정보 진위확인 및 상태조회 서비스](https://www.data.go.kr/data/15081808/openapi.do) |
| Base URL | `https://api.odcloud.kr/api/nts-businessman/v1` |
| 인증 | Query `serviceKey` |

| 엔드포인트 | 용도 | Body |
|-----------|------|------|
| `POST /validate` | 번호·개업일·대표자명 **진위확인** | `{ "businesses": [{ b_no, start_dt, p_nm, ... }] }` |
| `POST /status` | 번호만으로 **휴업/폐업·과세유형** | `{ "b_no": ["..."] }` |

- **메서드**: POST만 (JSON body). `serviceKey`, `returnType=JSON`은 query.
- **한도**: 1회 최대 100건, 개발계정 일 1,000,000건.
- **갱신**: 국세청 DB 약 30분 주기 (신규 개업 1~2일 지연 가능).

## 2. 지원둥지 연동

| 파일 | 역할 |
|------|------|
| `lib/gov-support/clients/ntsBusinessman.ts` | odcloud 호출 |
| `lib/profile/businessVerifyCache.ts` | 동일 입력 24h 메모리 캐시 |
| `POST /api/profile/verify-business` | 로그인·rate limit·캐시·표준 오류 |

**환경 변수**: `PUBLIC_DATA_SERVICE_KEY` (추가 키 불필요)

## 3. 진위확인 요청 필드 (필수/선택)

| 필드 | 필수 | 비고 |
|------|:---:|------|
| `b_no` | ○ | 10자리 숫자 |
| `start_dt` | ○ (validate) | YYYYMMDD |
| `p_nm` | ○ (validate) | 대표자 성명 |
| `b_nm` |  | 상호 → `company_name` 후보 |
| `b_adr` |  | 사업장 주소 (선택) |

응답: `valid` `01`=일치, `02`=불일치. 일치 시 `status` 객체에 상태조회 결과 포함.

## 4. 상태 코드 (운영 참고)

| b_stt_cd | 의미 |
|---------|------|
| 01 | 계속사업자 |
| 02 | 휴업자 |
| 03 | 폐업자 |

## 5. 로컬 테스트

```bash
# 키가 .env.local 에 있을 때
npx tsx scripts/verify-business-verify.ts
```

```bash
curl -X POST http://localhost:3000/api/profile/verify-business \
  -H "Content-Type: application/json" \
  -H "Cookie: <세션>" \
  -d '{"b_no":"0000000000","start_dt":"20000101","p_nm":"테스트","mode":"validate"}'
```

## 6. 비범위 (14-1-4 이후)

- 마이페이지 UI, DB `verified_at` 컬럼
- 프론트에 `serviceKey` 노출
- 일괄 100건 이상 배치
