#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/setup.sh"

CLI="node $SCRIPT_DIR/../skill/install/agentar_cli.mjs"

TEAM_SLUG="openclaw-starter-team"
TEAMS_DIR="$HOME/.openclaw/agentar-teams"
WORKSPACES_DIR="$HOME/.openclaw/agentar-workspaces"

echo "[test] Install team '$TEAM_SLUG'"
$CLI team install "$TEAM_SLUG" 2>&1

# Assert team.yaml exists
TEAM_YAML="$TEAMS_DIR/$TEAM_SLUG/team.yaml"
[ -f "$TEAM_YAML" ] || { echo "FAIL: team.yaml not found at $TEAM_YAML"; exit 1; }

# Assert team.yaml contains 10 members (count lines matching '- id:' pattern)
MEMBER_COUNT=$(grep -c '^\s*- id:' "$TEAM_YAML" 2>/dev/null || grep -c 'id:' "$TEAM_YAML" 2>/dev/null || echo "0")
[ "$MEMBER_COUNT" -ge 10 ] || { echo "FAIL: expected 10 members in team.yaml, found $MEMBER_COUNT"; exit 1; }

# Assert at least 5 agent workspace directories exist
if [ -d "$WORKSPACES_DIR" ]; then
  WORKSPACE_COUNT=$(find "$WORKSPACES_DIR" -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')
else
  WORKSPACE_COUNT=0
fi
[ "$WORKSPACE_COUNT" -ge 5 ] || { echo "FAIL: expected at least 5 agent workspaces, found $WORKSPACE_COUNT"; exit 1; }

echo "PASS: test-team-install"
source "$SCRIPT_DIR/teardown.sh"
