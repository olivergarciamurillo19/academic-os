# RUNBOOK.md

> Procedimientos operativos para Academic OS en producción. Pensado para leer a las 3:00 AM cuando algo revienta.
> URL producción: https://academic-os-mu.vercel.app · DB: https://xnbkfkalmxalxazqogmu.supabase.co

Regla universal: **cada incidente queda con un post-mortem corto en `docs/incidents/YYYY-MM-DD-nombre.md`** (1 página: qué pasó, impacto, causa raíz, arreglo, prevención).

---

## 1. Deploy falla en Vercel

**Síntomas:** PR con build en rojo, o `main` que no despliega.

**Diagnóstico:**

1. Abre el deployment en Vercel → pestaña **Build Logs**. Busca el primer `error` / `Error:` (no el último).
2. Causas típicas:
   - Typecheck/lint: `pnpm typecheck` / `pnpm lint` localmente reproduce.
   - Falta variable de entorno. Compara con [`ENV_VARS.md`](./setup/ENV_VARS.md). Recuerda: `NEXT_PUBLIC_*` se necesitan también en build.
   - Conflicto de versiones pnpm: revisa `packageManager` en `package.json` (pin `pnpm@10.0.0`).
   - Sentry build plugin falla subiendo source maps → revisa `SENTRY_AUTH_TOKEN` y `SENTRY_ORG`. Si no hay token, `next.config.mjs` ya esquiva el plugin.
3. Sentry suele crear un **release** por deploy; si el deploy falla antes de subir source maps, no aparecerá release. Cuando falla *después*, el release sí existe pero con errores → marcarlo como "errored" en Sentry.

**Acciones:**

- Quick fix: **Redeploy** en Vercel (a veces basta, especialmente tras rate-limit intermitente).
- Fix real: PR que arregle la causa → squash merge a `main`.
- Si el bloqueo dura > 30 min y había un deploy anterior OK → **rollback** (ver §6).

---

## 2. Base de datos caída / lenta

**Síntomas:** `/dashboard` responde 500, errores `connection refused`, Supabase muestra latencias altas.

**Diagnóstico:**

1. Supabase status page: https://status.supabase.com — ¿incidente activo en la región EU?
2. Supabase Dashboard → *Database → Reports* para CPU / conexiones / I/O.
3. Conexiones zombies:

   ```sql
   SELECT pid, usename, application_name, state, state_change, query
   FROM pg_stat_activity
   WHERE datname = current_database()
     AND state <> 'idle'
   ORDER BY state_change ASC
   LIMIT 50;
   ```

4. Sesiones idle-in-transaction > 5 min → cerrar:

   ```sql
   SELECT pg_terminate_backend(pid)
   FROM pg_stat_activity
   WHERE state = 'idle in transaction'
     AND state_change < now() - interval '5 minutes';
   ```

5. Índice saturado / query mala: Supabase → *Reports → Query performance*; si un query domina, revisa `EXPLAIN ANALYZE`.

**Acciones:**

- Supabase no tiene "failover" autoservicio; si incidente de plataforma, marca banner en la app (`NEXT_PUBLIC_STATUS_BANNER`) y espera.
- Si es el pooler agotado (Supavisor): aumenta pool size en Supabase Dashboard *Database → Settings*.
- Comunica en Discord/WhatsApp del equipo antes de intentar reparar.

---

## 3. Rate limit / error del LLM

**Síntomas:** Chat devuelve 429 / 500, ingestión de documento se queda en `processing` y luego `failed` con "rate_limit".

**Diagnóstico:**

1. OpenAI: https://platform.openai.com/account/limits — ver quota del organization y del API key usado.
2. Anthropic: https://console.anthropic.com → Usage. Límite por minuto/día.
3. Mira en Sentry el error exacto (`RateLimitError`, `OverloadedError`).

**Acciones:**

- **Retry con backoff exponencial**: el handler de Inngest (`ingestDocumentHandler`) tiene `MAX_ATTEMPTS = 3`; Inngest ya reintenta steps automáticamente (jitter + exp backoff). Para chat en tiempo real, implementar retry en cliente con 3 intentos max (500ms → 1s → 2s).
- **Modelo fallback**: si `OPENAI_API_KEY` tira, alternar a Anthropic (`ANTHROPIC_API_KEY`) para chat (embeddings siguen dependiendo de OpenAI — si se cae embeddings, pausar ingestión y encolar).
- **Subir quota**: en la página de platform de cada proveedor, aumentar tier si la demanda lo justifica.
- **Circuit breaker manual**: env var temporal `FEATURE_CHAT_DISABLED=1` → server action muestra banner "Chat pausado, volveremos en breve".

---

## 4. Inngest — jobs no procesan

**Síntomas:** PDFs subidos quedan en `documents.status = 'pending'` o `'processing'` indefinidamente; `reminders.sent_at` no se actualiza.

**Diagnóstico:**

1. Inngest Dashboard → https://app.inngest.com → *Runs*. Filtra por función. Busca `failed`.
2. En local: `npx inngest-cli@latest dev -u http://localhost:3000/api/inngest`. Abre http://localhost:8288 y mira *Stream*.
3. Verifica que `/api/inngest` de Vercel responde 200 al GET (signing challenge de Inngest).
4. Firma de webhooks: si el request de Inngest llega con `401 invalid signature`, tu `INNGEST_SIGNING_KEY` de Vercel no coincide con el proyecto de Inngest → regenera en Inngest dashboard y actualiza en Vercel.
5. Variables requeridas (ver [`ENV_VARS.md`](./setup/ENV_VARS.md)): `INNGEST_SIGNING_KEY`, `INNGEST_EVENT_KEY`.

**Acciones:**

- Re-ejecutar run desde Inngest UI (botón **Rerun**).
- Si los últimos N runs fallan por la misma excepción → PR hotfix, desplegar, reintentar.
- Para limpiar documentos atascados:

  ```sql
  UPDATE documents SET status='pending', processing_error=NULL
  WHERE status='processing'
    AND updated_at < now() - interval '30 minutes';
  ```

  Luego `inngest.send({ name: "document/ingest", data: { documentId } })` por cada uno.

---

## 5. Observabilidad — checklist rápido

Cuando algo huele raro pero no sabes dónde mirar:

1. **Sentry** → https://sentry.io → proyecto `academic-os-web`. Filtra por release del último deploy.
2. **Vercel Logs** → *Deployments → Runtime Logs*. Filtros por path (`/api/...`, `/dashboard`).
3. **Supabase Logs** → *Project → Logs Explorer*. Tabs: `API`, `Postgres`, `Auth`.
4. **PostHog** → session replay del user impactado (si tiene consentimiento).
5. **Inngest Runs** para jobs.

---

## 6. Rollback

### 6.1 Código (Vercel)

Opción A — UI (rápida y segura):
*Vercel → Deployments → selecciona un deployment Ready verde anterior → menú `…` → Promote to Production*.

Opción B — CLI:

```bash
vercel rollback            # selector interactivo
# o con deployment URL explícito
vercel rollback https://academic-os-xxxxx.vercel.app --yes
```

Requiere `vercel` CLI con sesión iniciada (`vercel login`) y proyecto linkado (`vercel link`).

### 6.2 Base de datos (Drizzle)

Drizzle no tiene `migrate:down` automático. Cada migración SQL que cambie estructura incluye un bloque `-- DOWN` comentado con el reverso (convención del repo; ver p.ej. `0002_rls_helpers_policies.sql`).

Procedimiento:

1. Identifica la última migración aplicada:

   ```sql
   SELECT * FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 5;
   ```

2. Copia el bloque `DOWN` correspondiente y ejecútalo en Supabase SQL Editor.
3. Borra la fila del historial:

   ```sql
   DELETE FROM drizzle.__drizzle_migrations WHERE hash = '<hash-de-la-migración>';
   ```

4. Ajusta el código del schema para que vuelva a coincidir con el estado revertido.

**Nunca** revertir una migración que destruya datos sin backup. Antes de un rollback destructivo:

```bash
# Backup rápido vía pg_dump (Supabase da connection string en Settings → Database)
pg_dump --no-owner --no-privileges --data-only \
  --table=<tabla_afectada> \
  "$DATABASE_URL" > backup-$(date +%F).sql
```

### 6.3 Coordinación rollback combinado

Si el rollback de código depende de volver a un estado de DB anterior:

1. Marcar incidente en Sentry + avisar al equipo.
2. Poner la app en *maintenance* (env `NEXT_PUBLIC_MAINTENANCE=1` si existe, o deploy rápido de página estática).
3. Rollback DB → rollback código → re-test.
4. Post-mortem en `docs/incidents/`.

---

## 7. Checks periódicos recomendados

- Semanalmente: revisar Sentry issues abiertos > 7 días.
- Semanalmente: Supabase → *Database → Extensions* — `pgvector`, `pg_cron`, `pg_net` siguen activos.
- Mensualmente: rotar `SUPABASE_SERVICE_ROLE_KEY` y redeployar.
- Mensualmente: comprobar quota OpenAI/Anthropic vs uso real.
