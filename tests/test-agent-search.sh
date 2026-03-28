#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/setup.sh"

CLI="node $SCRIPT_DIR/../skill/install/agentar_cli.mjs"

echo "[test] Search for 'orchestrator' -- expect non-empty results"
OUTPUT=$($CLI search orchestrator 2>&1)

# Assert output is non-empty and does not say "No agentars found"
[ -n "$OUTPUT" ] || { echo "FAIL: search returned empty output"; exit 1; }
echo "$OUTPUT" | grep -qv "No agentars found" || { echo "FAIL: search found no agentars for 'orchestrator'"; exit 1; }

# Assert output contains the keyword (slug or name should mention it)
echo "$OUTPUT" | grep -qi "orchestrator" || { echo "FAIL: search output does not contain 'orchestrator'"; exit 1; }

echo "PASS: test-agent-search"
source "$SCRIPT_DIR/teardown.sh"
