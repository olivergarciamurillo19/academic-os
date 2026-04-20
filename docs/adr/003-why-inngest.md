# ADR 003 — Inngest para trabajos en background

- **Título:** Usar Inngest como capa de jobs/eventos/crons en lugar de BullMQ, Trigger.dev u otros.
- **Status:** Accepted
- **Fecha:** 2026-04-20
- **Deciders:** Óliver, Armando

---

## Contexto

Academic OS tiene procesos que no encajan en el request/response de Next.js:

- **Ingestión de documentos** (download → parse → chunk → embed → insert) que puede durar decenas de segundos por PDF grande. Timeout de Vercel serverless ≈ 60 s (menos en free).
- **Sync iCal / Google Calendar** (V2) con polling cada 30 min.
- **Envío de recordatorios** (`reminders.remind_at`) con fan-out por canal (`email|push|inapp`).
- **Transcripción de audio** (V2) con Whisper.
- **Pipelines con reintentos** idempotentes cuando un LLM devuelve 429.

Regla explícita en `ACADEMIC_OS.md §4.4`: *todo lo que tarde > 5 s vive en un job, no en una ruta HTTP*.

Opciones consideradas: **BullMQ** (Redis self-host), **Trigger.dev** (similar a Inngest), **AWS SQS + Lambda**, **pg_cron + pg_net** dentro de Supabase, o rodar nuestro propio cron en un worker dyno.

## Decisión

Adoptar **Inngest** como orquestador de jobs y eventos.

- SDK `inngest` 3.x en `apps/web/package.json`.
- Funciones Inngest declaradas en `apps/web/src/app/api/inngest/**` (webhook único servido por Next).
- Handlers puros en `packages/ai/src/jobs/*.ts` (sin dependencia del paquete `inngest`) que se invocan desde las funciones Inngest, para evitar ciclos entre packages.
- Señales vía `inngest.send({ name: "document/ingest", data })`.
- Secretos: `INNGEST_SIGNING_KEY`, `INNGEST_EVENT_KEY` (ver `docs/setup/ENV_VARS.md`).

## Consecuencias

### Positivas

- **Cero infra**: no hay Redis propio, ni worker dyno, ni ECS. Todo corre como funciones serverless en nuestro propio endpoint `/api/inngest`.
- **Retries + step functions built-in**: cada `step.run(...)` es idempotente y reintentable. El pipeline de ingestión se declara como `step.run('parse') → step.run('chunk') → step.run('embed')` y si el paso 3 revienta, sólo se repite ese.
- **Crons declarativos** (`{ cron: "*/30 * * * *" }`) sin `pg_cron`.
- **Dev server local** (`npx inngest-cli@latest dev`) con UI de eventos, muy útil para depurar.
- **Observabilidad decente**: panel en https://app.inngest.com con runs, inputs, outputs, errores, reruns.
- **Free tier** generoso para V1 (50k steps/mes al momento del ADR); escalado por uso claro.
- **Migración trivial** si pega la factura: los handlers ya son funciones puras; mover a Trigger.dev, BullMQ o self-host es cuestión de envolverlos.

### Negativas

- **Nuevo vendor** → otra cuenta, otra facturación potencial, otro SDK que bumpear.
- **Latencia de round-trip** mayor que una cola in-process (Inngest hace webhook → nuestro endpoint → step → respuesta). Para jobs de segundos es irrelevante.
- **Debugging asíncrono** — como cualquier cola, requiere disciplina en logs y correlation IDs.
- **Dependencia del endpoint público**: `/api/inngest` tiene que estar accesible y firmado correctamente, o los runs se quedan en limbo.

### Neutras

- El mismo modelo mental ("eventos + step functions") sirve para todos los pipelines (docs, calendario, notificaciones), lo que simplifica el código a cambio de obligar a pensar en eventos.

## Alternativas consideradas

| Alternativa              | Por qué no                                                                                       |
| ------------------------ | ------------------------------------------------------------------------------------------------ |
| **BullMQ + Redis**       | Requiere Redis autogestionado (Upstash, Fly Redis, etc.) + worker dyno. Más infra que nuestras horas permiten. |
| **Trigger.dev**          | Muy parecido. Seleccionable como fallback. En 2026 su DX es buena; elegimos Inngest por step functions más maduros y free tier histórico. |
| **AWS SQS + Lambda**     | Potente y barato a escala, pero exige cuenta AWS + IAM + observabilidad aparte. Fricción alta para 2 personas. |
| **pg_cron + pg_net**     | Sirve para cron ligero dentro de Postgres, pero **no** es un job runner: sin retries, sin colas, sin fan-out. |
| **Worker dyno custom** (Fly.io node worker con queue en Postgres) | Reinventar la rueda. Código que mantener para siempre.     |
| **Vercel Cron**          | Sólo cron — no hay reintentos, no hay step fns, no hay colas. Lo usamos para triggers triviales pero no como backbone. |

## Revisión

Se revisa si:

- La factura mensual de Inngest supera 1.5× el coste combinado de (Upstash Redis + un worker dyno en Fly).
- Un downtime de Inngest bloquea procesos críticos por > 30 min en producción.
- El step-function model deja de ser expresivo para un pipeline complejo (p.ej. orquestación tipo SAGA con compensaciones).
