#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/setup.sh"

CLI="node $SCRIPT_DIR/../skill/install/agentar_cli.mjs"

TEAM_SLUG="openclaw-starter-team"
TEAMS_DIR="$HOME/.openclaw/agentar-teams"
WORKSPACES_DIR="$HOME/.openclaw/agentar-workspaces"

# Prerequisites: team must be installed first
TEAM_YAML="$TEAMS_DIR/$TEAM_SLUG/team.yaml"
if [ ! -f "$TEAM_YAML" ]; then
  echo "[test] Team not installed yet, installing first..."
  $CLI team install "$TEAM_SLUG" 2>&1
fi

# Count workspace directories before removal
WORKSPACE_COUNT_BEFORE=0
if [ -d "$WORKSPACES_DIR" ]; then
  WORKSPACE_COUNT_BEFORE=$(find "$WORKSPACES_DIR" -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')
fi

echo "[test] Remove team '$TEAM_SLUG'"
$CLI team remove "$TEAM_SLUG" 2>&1

# Assert team.yaml is deleted
[ ! -f "$TEAM_YAML" ] || { echo "FAIL: team.yaml still exists at $TEAM_YAML after removal"; exit 1; }

# Assert team directory is deleted
[ ! -d "$TEAMS_DIR/$TEAM_SLUG" ] || { echo "FAIL: team directory still exists after removal"; exit 1; }

# Assert agent workspace directories are preserved (not deleted by team remove)
WORKSPACE_COUNT_AFTER=0
if [ -d "$WORKSPACES_DIR" ]; then
  WORKSPACE_COUNT_AFTER=$(find "$WORKSPACES_DIR" -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')
fi
[ "$WORKSPACE_COUNT_AFTER" -eq "$WORKSPACE_COUNT_BEFORE" ] || { echo "FAIL: agent workspaces were deleted during team removal (before=$WORKSPACE_COUNT_BEFORE, after=$WORKSPACE_COUNT_AFTER)"; exit 1; }

echo "PASS: test-team-remove"
source "$SCRIPT_DIR/teardown.sh"
