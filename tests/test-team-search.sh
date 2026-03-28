#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/setup.sh"

CLI="node $SCRIPT_DIR/../skill/install/agentar_cli.mjs"

echo "[test] Search for team 'openclaw-starter' -- expect results contain the team"
OUTPUT=$($CLI team search openclaw-starter 2>&1)

# Assert output is non-empty and does not say "No teams found"
[ -n "$OUTPUT" ] || { echo "FAIL: team search returned empty output"; exit 1; }
echo "$OUTPUT" | grep -qv "No teams found" || { echo "FAIL: team search found no teams for 'openclaw-starter'"; exit 1; }

# Assert output mentions the team slug
echo "$OUTPUT" | grep -qi "openclaw-starter" || { echo "FAIL: team search output does not contain 'openclaw-starter'"; exit 1; }

echo "PASS: test-team-search"
source "$SCRIPT_DIR/teardown.sh"
