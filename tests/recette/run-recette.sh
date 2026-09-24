#!/usr/bin/env bash
# Exécuteur de recette ELARA — à brancher en CI avant toute release Octopus staging/production.
# Usage : bash tests/recette/run-recette.sh
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

echo "═══════════════════════════════════════════════════════"
echo " RECETTE ELARA — exécution locale/CI (Partie automatisée)"
echo "═══════════════════════════════════════════════════════"

PASS=0; FAIL=0

run() {  # run "label" "cd_dir" "cmd..."
  local label="$1" dir="$2"; shift 2
  echo; echo "── $label ──"
  if ( cd "$ROOT/$dir" && "$@" ); then echo "✅ $label : PASS"; PASS=$((PASS+1));
  else echo "❌ $label : FAIL"; FAIL=$((FAIL+1)); fi
}

run "api-nest : lint"            "apps/api-nest" npm run lint
run "api-nest : tests (vitest)"  "apps/api-nest" npm run test
run "api-nest : build (tsc)"     "apps/api-nest" npm run build
run "web : lint"                 "apps/web"      npm run lint
run "web : build (next)"         "apps/web"      npm run build

echo
echo "═══════════════════════════════════════════════════════"
echo " RÉSULTAT RECETTE AUTOMATISÉE : $PASS PASS / $FAIL FAIL"
echo "═══════════════════════════════════════════════════════"

[ "$FAIL" -eq 0 ] # code de sortie = échec si au moins un FAIL
