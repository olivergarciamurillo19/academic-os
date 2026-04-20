# ARCHITECTURE.md

> Arquitectura técnica de Academic OS. Documento vivo; cualquier cambio estructural requiere PR que actualice este archivo.
> URL producción: https://academic-os-mu.vercel.app · Supabase: https://xnbkfkalmxalxazqogmu.supabase.co

---

## 1. Diagrama de alto nivel

```
                    ┌─────────────────────────────────────────────────────┐
                    │                       VERCEL                        │
                    │  ┌───────────────────────────────────────────────┐  │
 ┌──────────────┐   │  │  apps/web  ·  Next.js 15 (App Router)         │  │
 │  Estudiante  │   │  │  ├─ React 19 Server Components + streaming    │  │
 │  navegador   │◄──┼──┤  ├─ Server Actions (mutaciones)                │  │
 │  (PWA)       │   │  │  ├─ Route Handlers /api/**  (JSON)             │  │
 └──────┬───────┘   │  │  ├─ middleware.ts  (auth gate + cohort ctx)    │  │
        │           │  │  └─ Turbopack (dev) · Sentry withSentryConfig  │  │
        │           │  └───────┬──────────────────┬────────────────────┘  │
        │           │          │                  │                       │
        │           └──────────┼──────────────────┼───────────────────────┘
        │                      │                  │
        │          @supabase/ssr │        drizzle-orm (node-postgres)
        │                      ▼                  ▼
        │           ┌──────────────────────────────────────────────────┐
        │           │                   SUPABASE                       │
        │           │  ┌───────────┐  ┌─────────────────────────────┐  │
        └──────────►│  │  Auth     │  │  Postgres 15                │  │
  magic-link / OAuth│  │ (GoTrue)  │  │  ├─ RLS por dominio         │  │
                    │  │ Google +  │  │  ├─ pgvector (HNSW cosine)  │  │
                    │  │ email OTP │  │  ├─ pg_trgm / GIN tsvector  │  │
                    │  └───────────┘  │  └─ auth.uid() en policies  │  │
                    │  ┌───────────┐  └─────────────────────────────┘  │
                    │  │ Storage   │        ▲                          │
                    │  │ bucket:   │        │ service_role key         │
                    │  │ materials │────────┘ (server-only)            │
                    │  └───────────┘                                   │
                    └──────────────────────────────────────────────────┘
                                   ▲                      ▲
                                   │                      │
        ┌──────────────────────────┘                      │
        │                                                 │
 ┌──────┴───────────┐    ┌──────────────────┐    ┌───────┴──────────────┐
 │ Inngest (jobs)   │    │ OpenAI / Anthropic│    │ Resend               │
 │ - ingest document│    │ - embeddings-3-sm │    │ - transactional mail │
 │ - sync iCal (V2) │    │ - chat completion │    │ - delegate invites   │
 │ - notifications  │    │ - (whisper V2)    │    └──────────────────────┘
 └──────────────────┘    └──────────────────┘
        ▲                        ▲
        │                        │
        └────────────┬───────────┘
                     │
              ┌──────┴────────┐            ┌──────────────────┐
              │  Sentry       │            │  PostHog (EU)    │
              │  errors + SM  │            │  product events  │
              └───────────────┘            └──────────────────┘
```

Regla de oro: **todo lo que tarde > 5 s se mueve a Inngest**. Los Route Handlers de Vercel tienen timeout corto; bloquear ahí es pedir caídas.

---

## 2. Explicación por capas

### 2.1 Frontend — Next.js 15 App Router
- `apps/web/src/app/**` organizado por App Router (layouts, server components, server actions).
- `typedRoutes: true` (ver `next.config.mjs`) para navegación type-safe.
- `transpilePackages` incluye los paquetes del workspace (`@academic-os/ai|auth|db|email`) para que el bundler resuelva TS directamente.
- `experimental.serverActions.bodySizeLimit: "2mb"` habilita upload moderado sin saltar a presigned URL.
- UI: Tailwind v4 (CSS-first, sin `tailwind.config.js`) + shadcn/ui sobre Radix primitives.
- Estado: `react-hook-form` + `zod` en forms, `sonner` para toasts.

### 2.2 Autenticación y tenancy
- `@supabase/ssr` (createBrowserClient / createServerClient) expuesto desde `packages/auth/src/client.ts`.
- `packages/auth/src/session.ts::getSessionUser(supabase)` devuelve `{ user, activeMembership }` consultando `memberships` con `status = 'active'`.
- `packages/auth/src/roles.ts` implementa jerarquía numérica `student(0) < delegate(1) < admin(2)` con `requireRole()` y `canManageCohort()`.
- `apps/web/src/middleware.ts` es el gate global:
  1. Si faltan las env de Supabase, deja pasar (dev sin secretos).
  2. `supabase.auth.getUser()`; si falla → redirect `/login?next=<url>`.
  3. Lee cookie `active_cohort_id` (fast-path); si no existe, consulta `memberships` y la setea 7 días.
  4. Sin membership activa → redirect `/onboarding`.
- `config.matcher` excluye `/login`, `/auth/**`, `/api/**`, `/_next/**`, favicon y assets estáticos. Los `/api/**` devuelven JSON 401 por sí mismos.

### 2.3 Base de datos — Supabase Postgres + Drizzle
- Schema tipado en `packages/db/src/schema/{identity,academic,materials,calendar,ai}.ts` (un fichero por dominio).
- Migraciones en `packages/db/migrations/*.sql` gestionadas por `drizzle-kit`.
- Extensiones activas: `pgcrypto`, `uuid-ossp`, `vector`, `pg_cron`, `pg_net`.
- RLS ON en todas las tablas de dominio; helpers SECURITY DEFINER:
  - `is_cohort_member(uuid)`
  - `my_active_cohort_ids()`
  - `is_cohort_manager(uuid)`  (true si role ∈ {delegate, admin})
- `service_role` key usada solo en jobs server-side (Inngest) y en route handlers internos.

### 2.4 Jobs — Inngest
- `packages/ai/src/jobs/ingest-document.ts` exporta `ingestDocumentHandler` puro (sin importar `inngest` para evitar ciclos). La función Inngest vive en `apps/web/src/app/api/inngest/**` y la invoca.
- Tres reintentos antes de marcar el documento como `failed` con `processing_error` rellenado.

### 2.5 LLMs
- `@anthropic-ai/sdk` y `openai` declarados en `apps/web/package.json`.
- Embeddings: `text-embedding-3-small` (1536 dim) — ver `packages/ai/src/ingestion/embed.ts`.
- Chat: OpenAI streamado en V1; Anthropic como fallback/primario en subject-chat cuando esté.

### 2.6 Email — Resend
- Paquete `@academic-os/email` encapsula templates y cliente Resend (`RESEND_API_KEY`).

### 2.7 Observabilidad
- Sentry se activa en `next.config.mjs` solo si `SENTRY_AUTH_TOKEN && SENTRY_ORG` (para no fallar builds locales sin token).
- PostHog (EU host por defecto, `eu.i.posthog.com`).
- Logs de Vercel + Supabase Logs Explorer.

---

## 3. Decisiones técnicas y porqués (resumen)

| Decisión          | Por qué                                                                                       | ADR         |
| ----------------- | --------------------------------------------------------------------------------------------- | ----------- |
| Supabase          | Postgres + RLS + Auth + Storage + pgvector bajo una consola; free tier válido para UAL        | ADR-001     |
| Drizzle ORM       | SQL-first, type-safe, soporte pgvector via customType, edge-friendly                          | ADR-002     |
| Inngest           | Retries, crons, step functions sin worker dyno; DX integrada con Next                         | ADR-003     |
| Next.js 15        | Server Components + streaming, Server Actions, typed routes, Turbopack, integración Sentry    | ADR-004     |
| Tailwind v4       | CSS-first preset (`@academic-os/config-tailwind`), sin config JS                              | —           |
| pnpm + Turborepo  | Workspaces monorepo, cache local+remota                                                       | —           |

Regla: cambio de capa = nuevo ADR en `docs/adr/`.

---

## 4. Pipeline RAG (ingestión)

Origen del código: `packages/ai/src/ingestion/*.ts` y `jobs/ingest-document.ts`.

```
 [usuario sube PDF]
        │
        ▼
 Server Action crea resources (kind='pdf', storagePath)
        │
        ▼
 inngest.send({ name: "document/ingest", data: { documentId } })
        │
        ▼
 ┌─────────────────────── ingestDocumentHandler ─────────────────────┐
 │ 1. Lee documents + resource (Drizzle)                             │
 │ 2. documents.status = 'processing'                                │
 │ 3. supabase.storage.from('materials').download(storagePath)       │
 │ 4. parsePdf(buffer)  ← unpdf → fallback extracción buffer crudo   │
 │ 5. chunkText(text)   ← ventana ~600 tokens, overlap 50            │
 │ 6. embedBatch(chunks) ← OpenAI text-embedding-3-small (1536)      │
 │ 7. INSERT INTO chunks (embedding vector, subject_id, topic_id…)   │
 │ 8. documents.status = 'indexed', indexed_at = now(), text_extracted=true │
 │    on error → documents.status = 'failed', processing_error = msg │
 └───────────────────────────────────────────────────────────────────┘
        │
        ▼
 [chat pregunta] → retrieve: SELECT ... FROM chunks ORDER BY embedding <=> :q
                   (HNSW cosine) + opcionalmente GIN tsvector híbrido
                   → top-k → prompt al LLM → respuesta con citations
```

Índices relevantes (aplicados por migración raw SQL, ver `packages/db/src/schema/ai.ts::AI_INDEXES_SQL`):
- `idx_chunks_embedding` USING hnsw (embedding vector_cosine_ops)
- `idx_chunks_fts` USING gin(to_tsvector('spanish', content))

---

## 5. Flujo de autenticación

```
┌──────────┐                                                      ┌────────────┐
│ /login   │  magic link / Google OAuth  ──────►  Supabase Auth   │  GoTrue    │
└────┬─────┘                                      issues JWT       └──────┬─────┘
     │                                                                    │
     │  redirect to /auth/confirm?code=...                                │
     ▼                                                                    │
┌──────────────────┐  verifyOtp  → sets sb-access-token + sb-refresh-token cookies
│ /auth/confirm    │──────────────────────────────────────────────────────┘
│ Route handler    │
└──────┬───────────┘
       │  redirect → /dashboard (or ?next)
       ▼
┌──────────────────┐   matcher excluye /login /auth /api /_next
│ middleware.ts    │
│ 1. getUser() vía @supabase/ssr                                          
│ 2. cookie active_cohort_id  ──fast path──► next()                        
│ 3. query memberships status='active' LIMIT 1                            
│ 4. sin membership → /onboarding                                         
│ 5. con membership → set cookie (7d) → next()                            
└──────┬───────────┘
       ▼
┌──────────────────┐  server component / action usa createServerClient(cookies())
│ RSC / action     │  → supabase-js hace requests con JWT de usuario → RLS filtra
└──────────────────┘
```

RLS: **la lista de filas visibles la decide Postgres**, no el código. El server action nunca "olvida" añadir `WHERE user_id = X` porque la política lo impone.

---

## 6. Árbol relevante

Ver `ACADEMIC_OS.md §13` para el layout canónico. Lo real hoy:

```
academic-os/
├─ apps/web/                 # Next.js 15 + middleware + server actions
├─ packages/
│  ├─ db/                    # Drizzle schema + migrations + seeds
│  ├─ auth/                  # Supabase SSR helpers + roles
│  ├─ ai/                    # Ingestion pipeline + job handlers
│  ├─ email/                 # Resend templates
│  ├─ config-eslint/
│  ├─ config-ts/
│  └─ config-tailwind/
├─ docs/                     # Este directorio
└─ .env.example
```
