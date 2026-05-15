#!/bin/bash
# ============================================================
# 지원둥지 자동 sync 설치 스크립트 (macOS launchd)
# 실행: bash scripts/setup-launchd.sh
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PLIST_NAME="com.policyfund.sync"
PLIST_SRC="$PROJECT_DIR/launchd/$PLIST_NAME.plist"
PLIST_DEST="$HOME/Library/LaunchAgents/$PLIST_NAME.plist"
LOG_DIR="$PROJECT_DIR/logs"

echo ""
echo "========================================"
echo "  지원둥지 자동 sync 설치"
echo "========================================"
echo ""

# 로그 디렉토리 생성
mkdir -p "$LOG_DIR"
echo "✅ 로그 디렉토리: $LOG_DIR"

# LaunchAgents 디렉토리 생성
mkdir -p "$HOME/Library/LaunchAgents"

# plist 파일에 실제 경로 주입
sed "s|POLICY_FUND_PATH|$PROJECT_DIR|g" "$PLIST_SRC" > "$PLIST_DEST"
echo "✅ plist 설치: $PLIST_DEST"

# 기존 job이 있으면 언로드
launchctl unload "$PLIST_DEST" 2>/dev/null || true

# 새 job 로드
launchctl load "$PLIST_DEST"
echo "✅ launchd 등록 완료"

echo ""
echo "========================================"
echo "  설정 완료!"
echo "  - 매일 오전 9시 자동 실행"
echo "  - 로그: $LOG_DIR/sync.log"
echo ""
echo "  수동 실행:    npm run sync"
echo "  즉시 실행:    launchctl start $PLIST_NAME"
echo "  자동실행 해제: launchctl unload $PLIST_DEST"
echo "========================================"
echo ""
