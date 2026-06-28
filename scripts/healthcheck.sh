#!/usr/bin/env bash
set -euo pipefail

SERVER="${1:-localhost}"
printf "Age of Agents Healthcheck\nTarget: %s\n\n" "$SERVER"

check_service() {
    local name="$1"
    local url="$2"
    local expected="${3:-}"

    if [[ -n "$expected" ]]; then
        if curl -sf "$url" | grep -q "$expected"; then
            printf "  ✅ %s\n" "$name"
            return 0
        fi
    else
        if curl -sf "$url" >/dev/null; then
            printf "  ✅ %s\n" "$name"
            return 0
        fi
    fi
    printf "  ❌ %s\n" "$name"
    return 1
}

FAILED=0

echo "Core:"
check_service "Age of Agents Server" "http://$SERVER:5173/health" "ok" || FAILED=1
check_service "Age of Agents Client" "http://$SERVER:3000/" "Age of Agents" || FAILED=1

echo ""
if [[ $FAILED -eq 0 ]]; then
    echo "🎉 All services healthy!"
    exit 0
else
    echo "⚠️  Some services are down"
    exit 1
fi