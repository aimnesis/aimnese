#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://localhost:3000}"

cecho() { printf "\033[1;36m%s\033[0m\n" "$*"; }
ok()    { printf "  ✅ %s\n" "$*"; }
fail()  { printf "  ❌ %s\n" "$*"; exit 1; }

check_200() {
  local path="$1"
  cecho "GET $path"
  code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE$path")
  [[ "$code" == "200" ]] || fail "Esperava 200 em $path, veio $code"
  ok "$path → 200"
}

check_4xx() {
  local method="$1"; local path="$2"; local expect="$3"
  cecho "$method $path (espera $expect)"
  code=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$BASE$path")
  [[ "$code" == "$expect" ]] || fail "Esperava $expect em $method $path, veio $code"
  ok "$method $path → $expect"
}

echo "=== Smoke: $BASE ==="

# Páginas públicas
check_200 "/"
check_200 "/pricing"

# Health
check_200 "/api/health"

# Modes (sem auth → 401)
check_4xx POST "/api/modes/general"  "401"
check_4xx POST "/api/modes/studies"  "401"
check_4xx POST "/api/modes/plantao"  "401"
check_4xx POST "/api/modes/consultorio" "401"
check_4xx POST "/api/modes/analysis" "401"
check_4xx POST "/api/modes/specialties" "401"

# Stripe (sem auth → 401)
check_4xx POST "/api/stripe/checkout" "401"
check_4xx GET  "/api/stripe/subscription" "401"

echo "OK ✅"