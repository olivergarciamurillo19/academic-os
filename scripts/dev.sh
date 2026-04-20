#!/usr/bin/env bash
# scripts/dev.sh — arranca Supabase local, Next dev y Inngest dev en paralelo.
# Requiere: supabase CLI, Docker Desktop corriendo, pnpm y Node 20.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

GREEN="\033[1;32m"; CYAN="\033[1;36m"; YELLOW="\033[1;33m"; RED="\033[1;31m"; RESET="\033[0m"

log() { printf "%b[dev]%b %s\n" "$CYAN" "$RESET" "$*"; }
warn() { printf "%b[dev]%b %s\n" "$YELLOW" "$RESET" "$*"; }
fail() { printf "%b[dev]%b %s\n" "$RED" "$RESET" "$*" >&2; exit 1; }

command -v supabase >/dev/null || fail "supabase CLI no encontrado. Instala con: brew install supabase/tap/supabase"
command -v pnpm >/dev/null || fail "pnpm no encontrado. Instala con: npm i -g pnpm"
command -v docker >/dev/null || warn "docker no encontrado — supabase start fallará"

log "Arrancando Supabase local (docker)…"
supabase start > /tmp/academic-os-supabase.log 2>&1 &
SUPABASE_PID=$!

cleanup() {
  log "Deteniendo procesos hijos…"
  kill $SUPABASE_PID 2>/dev/null || true
  kill $NEXT_PID 2>/dev/null || true
  kill $INNGEST_PID 2>/dev/null || true
  supabase stop >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

# Esperar a que Supabase responda.
for i in {1..60}; do
  if curl -fsS http://localhost:54321/health >/dev/null 2>&1; then break; fi
  sleep 1
done

log "Aplicando migraciones…"
pnpm db:migrate || warn "db:migrate falló; continúo"

log "Lanzando Next.js dev server…"
pnpm --filter @academic-os/web dev 2>&1 | sed -e "s/^/$(printf '%b[next]%b ' "$GREEN" "$RESET")/" &
NEXT_PID=$!

if [[ -n "${INNGEST_SIGNING_KEY:-}" ]]; then
  log "Lanzando Inngest dev server…"
  npx --yes inngest-cli@latest dev --no-discovery -u http://localhost:3000/api/inngest 2>&1 \
    | sed -e "s/^/$(printf '%b[inngest]%b ' "$YELLOW" "$RESET")/" &
  INNGEST_PID=$!
else
  warn "INNGEST_SIGNING_KEY no definido; omitiendo inngest dev"
fi

log "Listo: http://localhost:3000 (Next) · http://localhost:54323 (Supabase Studio)"
wait
