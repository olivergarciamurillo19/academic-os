# ENV_VARS.md

> Variables de entorno de Academic OS. Fuente de verdad: `.env.example` (raíz). Si añades una nueva: actualiza `.env.example` **y** esta tabla en el mismo PR.

- **`NEXT_PUBLIC_*`** se embeben en el bundle del cliente ⇒ **no poner secretos**.
- Todo lo demás es server-only (Node runtime, Server Actions, Route Handlers, Inngest).
- En Vercel: sección *Project → Settings → Environment Variables*. En local: `.env.local`.

---

## Tabla

| Variable                          | ¿Obligatoria?                    | Cliente / Server     | Dónde se obtiene                                                                 | Quién la usa                                                                 |
| --------------------------------- | -------------------------------- | -------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`        | Sí (si quieres auth/DB real)     | Cliente **y** server | Supabase Dashboard → Project Settings → API → `Project URL`                      | `packages/auth` (browser + server client), `middleware.ts`                   |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`   | Sí (idem)                        | Cliente **y** server | Supabase Dashboard → Project Settings → API → `anon public`                      | `packages/auth`, `middleware.ts`                                             |
| `SUPABASE_SERVICE_ROLE_KEY`       | Sí en server (jobs, admin tasks) | **Server only**      | Supabase Dashboard → Project Settings → API → `service_role` (clic en "Reveal")  | Pipeline de ingestión (`packages/ai`), scripts de seed, route handlers admin |
| `ANTHROPIC_API_KEY`               | Opcional (V1 usa OpenAI)         | Server               | https://console.anthropic.com → API Keys                                         | `@anthropic-ai/sdk` en `apps/web` (chat alternativo)                         |
| `OPENAI_API_KEY`                  | Sí (chat + embeddings)           | Server               | https://platform.openai.com/api-keys                                             | `packages/ai/src/ingestion/embed.ts`, chat route en `apps/web`               |
| `RESEND_API_KEY`                  | Sí para emails transaccionales   | Server               | https://resend.com → API Keys                                                    | `packages/email` (magic link personalizado, recordatorios)                   |
| `INNGEST_SIGNING_KEY`             | Sí en prod                       | Server               | https://app.inngest.com → Project → Signing Key                                  | Route handler `/api/inngest` — verifica firmas                               |
| `INNGEST_EVENT_KEY`               | Sí en prod                       | Server               | Inngest → Project → Event Keys                                                   | Cliente Inngest cuando `inngest.send(...)`                                   |
| `NEXT_PUBLIC_SENTRY_DSN`          | Recomendada                      | Cliente              | Sentry → Settings → Projects → `academic-os-web` → Client Keys (DSN)             | Sentry SDK del browser                                                       |
| `SENTRY_DSN`                      | Recomendada                      | Server               | Mismo DSN (Sentry soporta server + client con el mismo proyecto)                 | `@sentry/nextjs` runtime node                                                |
| `SENTRY_AUTH_TOKEN`               | Solo CI / builds con source maps | Server (build time)  | Sentry → Settings → Account → Auth Tokens (scope: `project:releases`, `org:read`) | Plugin de `withSentryConfig` en `next.config.mjs` al subir source maps      |
| `SENTRY_ORG`                      | Solo CI / builds                 | Server (build time)  | Nombre slug de tu organización en Sentry                                         | `withSentryConfig` — si falta, Sentry build plugin queda desactivado         |
| `SENTRY_PROJECT`                  | Default `academic-os-web`        | Server (build time)  | Slug del proyecto Sentry                                                         | `withSentryConfig`                                                           |
| `NEXT_PUBLIC_POSTHOG_KEY`         | Opcional (analytics)             | Cliente              | PostHog → Project Settings → Project API Key                                     | PostHog SDK en cliente                                                       |
| `NEXT_PUBLIC_POSTHOG_HOST`        | Opcional                         | Cliente              | Default `https://eu.i.posthog.com` si vacío                                      | PostHog SDK                                                                  |

---

## Notas por variable

### Supabase
- **Service role key** da acceso completo saltándose RLS. **Nunca** la uses desde `apps/web` en componentes `'use client'`. Convención interna: solo se importa bajo `apps/web/src/app/api/**` o en scripts de `packages/db/scripts/`.
- URL del proyecto dev actual: `https://xnbkfkalmxalxazqogmu.supabase.co` (consúltala en Supabase dashboard por si cambia).

### OpenAI
- Embeddings: modelo `text-embedding-3-small` (1536 dim) — hardcodeado en `packages/ai/src/ingestion/embed.ts`. No lo cambies sin alinear con la dimensión de la columna `chunks.embedding vector(1536)` del schema.

### Inngest
- En dev local puedes usar el Inngest dev server (`npx inngest-cli@latest dev`). No hace falta signing key en ese modo.
- En Vercel preview + prod, configura ambas (`SIGNING_KEY` y `EVENT_KEY`) o los webhooks fallarán en firma.

### Sentry
- `next.config.mjs` solo aplica `withSentryConfig` si `SENTRY_AUTH_TOKEN && SENTRY_ORG` están presentes. En local se comporta como build normal.
- Source maps: `hideSourceMaps: true` y `widenClientFileUpload: true` activos; `disableLogger: true` para no ensuciar logs en prod.

### PostHog
- Host EU por defecto (cumplimiento RGPD para estudiantes UAL). No cambies a `us.i.posthog.com` sin revisar políticas.

---

## Convención de archivos `.env`

| Archivo            | Commit | Propósito                                          |
| ------------------ | ------ | -------------------------------------------------- |
| `.env.example`     | Sí     | Plantilla con llaves vacías (canon del contrato)   |
| `.env.local`       | **No** | Tu copia con secretos reales, cargada por Next.js  |
| `.env.*.local`     | **No** | Overrides por entorno (prod/preview/test)          |
| `.env`             | **No** | Usado por `drizzle-kit` / scripts node fuera de Next |

Turborepo ya declara `.env`, `.env.local`, `.env.*.local` como `globalDependencies` — un cambio invalida la cache y rebuildea.
