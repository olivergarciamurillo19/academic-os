# E2E Smoke Tests

Playwright smoke tests for Academic OS. They cover the golden path:

- `auth.spec.ts` — login page loads and the form is visible.
- `dashboard.spec.ts` — authenticated dashboard renders sections (runs only when `E2E_AUTH_STORAGE` is set).
- `materials.spec.ts` — upload PDF → appears in list (requires auth + a live Supabase Storage).
- `chat.spec.ts` — send message → response streams back (requires auth + LLM).
- `kanban.spec.ts` — create task → appears in column.

## Running

```bash
# One-time:
pnpm test:e2e:install

# Against local dev server (auto-spawns it):
pnpm test:e2e

# Against a deployed preview:
PLAYWRIGHT_BASE_URL=https://academic-os-mu.vercel.app pnpm test:e2e
```

## Authenticated tests

Tests that need a signed-in user expect a Playwright storage state file at the
path in `E2E_AUTH_STORAGE`. Generate it once manually via
`pnpm exec playwright codegen` and save the JSON; the CI generates it with the
seed-test-user script (`scripts/seed-test-user.ts`).
