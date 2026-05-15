# Vercel Pro 플랜 업그레이드 가이드

## Vercel Pro로 전환하면 로컬 sync 스크립트 없이 자동화 가능

### 전환 방법 (3단계)

#### 1. vercel.json에 crons 추가

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "regions": ["icn1"],
  "crons": [
    {
      "path": "/api/admin/sync",
      "schedule": "0 0 * * *"
    }
  ]
}
```

> `0 0 * * *` = 매일 UTC 00:00 (한국시간 오전 9시)

#### 2. 로컬 launchd 비활성화

```bash
launchctl unload ~/Library/LaunchAgents/com.policyfund.sync.plist
```

#### 3. 배포

```bash
git add vercel.json && git commit -m "feat: Vercel Pro cron 활성화" && git push
```

---

### 현재 구조 (Hobby 플랜)

```
Mac (한국 IP)
  └─ launchd (매일 오전 9시)
       └─ npm run sync
            ├─ 기업마당 API
            ├─ K-Startup API
            └─ Supabase upsert
```

### 전환 후 구조 (Pro 플랜)

```
Vercel Cron (매일 UTC 00:00 = KST 09:00)
  └─ GET /api/admin/sync
       ├─ 기업마당 API  (icn1 한국 서버)
       ├─ K-Startup API (icn1 한국 서버)
       └─ Supabase upsert
```
