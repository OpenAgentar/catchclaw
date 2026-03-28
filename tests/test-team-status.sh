#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/setup.sh"

CLI="node $SCRIPT_DIR/../skill/install/agentar_cli.mjs"

TEAM_SLUG="openclaw-starter-team"

echo "[test] Check team status for '$TEAM_SLUG'"

# Prerequisites: team must be installed first
TEAMS_DIR="$HOME/.openclaw/agentar-teams"
TEAM_YAML="$TEAMS_DIR/$TEAM_SLUG/team.yaml"
if [ ! -f "$TEAM_YAML" ]; then
  echo "[test] Team not installed yet, installing first..."
  $CLI team install "$TEAM_SLUG" 2>&1
fi

OUTPUT=$($CLI team status "$TEAM_SLUG" 2>&1)

# Assert output is non-empty
[ -n "$OUTPUT" ] || { echo "FAIL: team status returned empty output"; exit 1; }

# Assert output contains team name
echo "$OUTPUT" | grep -qi "Team:" || { echo "FAIL: team status output missing 'Team:' header"; exit 1; }

# Assert output contains member information (ID column header or member IDs)
echo "$OUTPUT" | grep -qi "ID" || { echo "FAIL: team status output missing member listing"; exit 1; }

# Assert output mentions installed status
echo "$OUTPUT" | grep -qi "yes\|installed" || { echo "FAIL: team status does not show any installed members"; exit 1; }

echo "PASS: test-team-status"
source "$SCRIPT_DIR/teardown.sh"
