#!/usr/bin/env bash
# scripts/reset-db.sh — destruye y regenera la DB local.
# DESTRUCTIVE. Úsalo solo contra Supabase local, NUNCA contra staging/prod.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ "${DATABASE_URL:-}" == *"supabase.co"* ]]; then
  echo "Refuse: DATABASE_URL apunta a Supabase remoto. Abortando." >&2
  exit 2
fi

command -v supabase >/dev/null || { echo "supabase CLI requerido" >&2; exit 1; }

echo "[reset-db] Stopping Supabase…"
supabase stop --no-backup || true

echo "[reset-db] Starting Supabase fresh…"
supabase start

echo "[reset-db] Applying Drizzle migrations…"
pnpm db:migrate

echo "[reset-db] Seeding UAL…"
pnpm db:seed

echo "[reset-db] Done. Studio: http://localhost:54323"
