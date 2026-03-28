#!/usr/bin/env bash
set -euo pipefail
export AGENTAR_HOME="${AGENTAR_HOME:-$HOME/.openclaw-test}"
export AGENTAR_API_BASE_URL="${AGENTAR_API_BASE_URL:-https://catchclaw.me}"
mkdir -p "$AGENTAR_HOME"
echo "[setup] AGENTAR_HOME=$AGENTAR_HOME"
echo "[setup] API=$AGENTAR_API_BASE_URL"
