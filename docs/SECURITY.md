# Seguridad — Academic OS

> Checklist viva. Actualizar con cada incidente, auditoría o cambio de superficie.

## 1. Autenticación y sesión

- Supabase Auth con magic link + Google OAuth. Sin contraseña.
- Cookies con `Secure`, `HttpOnly`, `SameSite=Lax`, scope `/`.
- Middleware (`apps/web/src/middleware.ts`) revalida sesión en cada request
  no exento. Rutas `/api/**`, `/login`, `/auth/**`, `_next` quedan fuera
  para permitir respuestas JSON propias.
- JWT firmado por Supabase. Nunca lo almacenamos ni reescribimos nosotros.

## 2. Autorización y datos

- **RLS activa en todas las tablas.** Cada dominio
  (`identity/academic/materials/calendar/ai`) tiene sus políticas en
  `packages/db/migrations/0002_*.sql` y `0003_*.sql`. Ningún código de
  aplicación debe usar la `service_role` salvo jobs administrativos en
  `apps/web/src/lib/supabase-admin.ts`.
- Lectura cruzada entre usuarios sólo posible mediante membresías
  compartidas (`memberships`, `subject_members`). Verificado con el test
  `packages/db/tests/rls.test.ts` (skipped por defecto; requiere DB real).

## 3. Entrada de usuario

- Todo payload entra por Zod (`z.object(...)`). Ver
  `apps/web/src/app/api/**/route.ts`.
- Uploads: `packages/shared/src/upload-guard.ts` valida
  - tamaño ≤ 50 MB por fichero, 500 MB por usuario (cuota DB),
  - magic bytes reales (no extensión) — PDF empieza con `%PDF-`,
    imágenes PNG/JPEG/WEBP/GIF detectadas por cabecera.
- Markdown de usuario se renderiza vía `react-markdown` con `remark-gfm`
  sin `rehypeRaw`; inyección HTML imposible por defecto.

## 4. Rate limiting

- `packages/shared/src/rate-limit.ts` — contador deslizante en memoria
  (por worker). Reglas por defecto en `RULES`:
  - `/api/ai/chat`: 30/hora por usuario
  - `/api/ai/tests`: 10/hora por usuario
  - `/api/auth/*`: 5 / 15min por IP
  - `/api/ingest/*`: 20/hora por usuario
- Para contadores globales reales (multi-worker) enchufar
  `@upstash/ratelimit` cuando `UPSTASH_REDIS_REST_URL` esté presente.

## 5. Cabeceras HTTP

- Definidas en `apps/web/src/lib/security-headers.ts` y conectadas desde
  `next.config.mjs` mediante `async headers()`:
  - `Content-Security-Policy` con listas explícitas (Supabase, OpenAI,
    Anthropic, Inngest, PostHog, Sentry).
  - `X-Frame-Options: DENY` — nada de iframes.
  - `X-Content-Type-Options: nosniff`.
  - `Referrer-Policy: strict-origin-when-cross-origin`.
  - `Permissions-Policy` con cámara/micro/geo/usb desactivados.
  - `Strict-Transport-Security` de 2 años con preload.

## 6. Auditoría

- `apps/web/src/lib/audit.ts` emite registros estructurados por
  acciones sensibles (`auth.login`, `material.upload`,
  `material.delete`, `admin.*`, `blackboard.sync`). Hoy escribe al
  logger pino; cuando aterrice la tabla `audit_logs` se migra a
  `INSERT` sin cambiar callers.

## 7. Secretos

- Todas las claves viven en Vercel env vars (ver
  `docs/setup/ENV_VARS.md`). Nunca commitear `.env.local`.
- `SUPABASE_SERVICE_ROLE_KEY` sólo se importa desde
  `apps/web/src/lib/supabase-admin.ts`, que es server-only.
- Sentry redacta `authorization`, `cookie`, `password`, `token` por
  defecto — configurado en `packages/shared/src/logger.ts`.

## 8. Pendientes

- Tabla `audit_logs` persistida con RLS `select for service_role only`.
- Integrar Upstash Ratelimit en prod para contador compartido entre
  regiones de Vercel.
- CSP en modo `report-only` durante una semana antes de aplicar (flag
  en Vercel para el primer deploy con los headers activos).
