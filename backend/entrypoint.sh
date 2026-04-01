#!/bin/sh
set -e
echo "=== STARTUP DIAGNOSTICS ==="
echo "YANDEX_FOLDER_ID=${YANDEX_FOLDER_ID:-MISSING}"
echo "YANDEX_OAUTH_TOKEN set: $([ -n "$YANDEX_OAUTH_TOKEN" ] && echo YES || echo MISSING)"
echo "OPENROUTER_API_KEY set: $([ -n "$OPENROUTER_API_KEY" ] && echo YES || echo MISSING)"
echo "GEMINI_MODEL=${GEMINI_MODEL:-default}"
echo "==========================="
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --log-level debug
