#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/setup.sh"

CLI="node $SCRIPT_DIR/../skill/install/agentar_cli.mjs"

AGENT_SLUG="orchestrator"
WORKSPACES_DIR="$HOME/.openclaw/agentar-workspaces"

echo "[test] Install agent '$AGENT_SLUG' with --name flag"
$CLI install "$AGENT_SLUG" --name "$AGENT_SLUG" 2>&1

# Assert workspace directory was created
WORKSPACE_PATH="$WORKSPACES_DIR/$AGENT_SLUG"
[ -d "$WORKSPACE_PATH" ] || { echo "FAIL: workspace directory not created at $WORKSPACE_PATH"; exit 1; }

# Assert SOUL.md exists in the workspace
[ -f "$WORKSPACE_PATH/SOUL.md" ] || { echo "FAIL: SOUL.md not found in $WORKSPACE_PATH"; exit 1; }

echo "PASS: test-agent-install"
source "$SCRIPT_DIR/teardown.sh"
