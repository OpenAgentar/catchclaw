#!/usr/bin/env bash
set -euo pipefail
AGENTAR_HOME="${AGENTAR_HOME:-$HOME/.openclaw-test}"
echo "[teardown] Cleaning $AGENTAR_HOME"
rm -rf "$AGENTAR_HOME"
echo "[teardown] Done"
