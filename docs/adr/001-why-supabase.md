# ADR 001 — Supabase como plataforma de backend

- **Título:** Usar Supabase (Postgres + Auth + Storage + Realtime + pgvector) como backend unificado.
- **Status:** Accepted
- **Fecha:** 2026-04-20
- **Deciders:** Óliver, Armando

---

## Contexto

Academic OS es una app web (PWA) para estudiantes de la UAL con necesidades heterogéneas pero comunes a muchas SaaS educativas:

- Autenticación: magic link + Google OAuth, más cohortes multi-tenant.
- Base de datos relacional con modelo de tenancy por cohort (ver `docs/DB_SCHEMA.md`).
- Almacenamiento de archivos: PDFs de apuntes, imágenes de pizarra, grabaciones (V2).
- RAG sobre esos archivos → embeddings + búsqueda vectorial.
- Realtime (V2) para chat de clase.
- Dos desarrolladores (frontend + backend) sin tiempo para mantener infraestructura dispersa.

Las opciones consideradas eran combinaciones tipo: **Firebase** (BaaS todo-en-uno no-Postgres), **raw Postgres** autogestionado (RDS/Fly/etc.) + Clerk + S3 + Pinecone, o **Neon** (Postgres serverless) + Clerk + Cloudflare R2 + Qdrant.

## Decisión

Adoptar **Supabase** como backend principal:

- Postgres 15 gestionado con **RLS** nativo.
- **Auth** (GoTrue) con magic link y OAuth (Google) out-of-the-box; integración SSR oficial via `@supabase/ssr`.
- **Storage** S3-compatible con políticas RLS análogas a las de Postgres.
- **pgvector** habilitable con una línea (`create extension vector`); columnas `vector(1536)` en Drizzle via `customType`.
- **Realtime** broadcasting sobre el mismo Postgres.
- Plan **Free** suficiente para la V1 con los dos fundadores + users iniciales.
- Región **EU (Frankfurt)** disponible — requisito soft para datos de estudiantes UAL.

El acceso desde la app usa:
- `@supabase/ssr` (browser + server) en `packages/auth/src/client.ts`.
- `SUPABASE_SERVICE_ROLE_KEY` en jobs y scripts server-only.
- `drizzle-orm` contra la misma base de datos para queries tipadas.

## Consecuencias

### Positivas

- **Una consola, una cuenta, un vendor**: reduce coordinación (dos personas, no seis dashboards distintos).
- **RLS de verdad** — la autorización se impone en la DB, no en código de aplicación. El tenant leak se vuelve muy difícil (§5 del blueprint).
- **Integración Next.js** bien documentada; el helper `@supabase/ssr` cubre App Router + middleware sin hacks.
- **pgvector en la misma DB**: no hay segunda base para vectores → no hay sync. Coste marginal ~0.
- **Coste predecible**: free tier de 500 MB DB + 1 GB Storage arranca gratis; upgrade escalonado.
- **Exportable**: es Postgres estándar; `pg_dump` y adiós — no quedamos atrapados en una DSL propietaria.

### Negativas

- **Plataforma cerrada**: si Supabase baja, baja la app. Mitigado con monitoreo (Sentry) y ejercicio de restore (runbook §2).
- **Cold starts** del pooler (Supavisor) bajo carga variable; se han visto picos de latencia ocasional.
- **Quotas en free**: 500 MB DB + 50k MAUs auth. Habrá que pasar a Pro cuando haya uso real.
- **Servicios nuevos** (branching, edge functions nuevas) a veces llegan como beta.

### Neutras

- La configuración RLS es un skill que ambos deben aprender bien — es poder y responsabilidad.
- El `service_role` key es una llave con bypass total: hay que guardarla como oro.

## Alternativas consideradas

| Alternativa                               | Por qué no                                                                 |
| ----------------------------------------- | -------------------------------------------------------------------------- |
| **Firebase / Firestore**                  | NoSQL mal encajado con nuestro modelo relacional (cohortes, subjects, memberships con FKs reales). Auth OK pero sin RLS equivalente a Postgres. No pgvector nativo. |
| **Raw Postgres en RDS/Fly + Clerk + S3 + Pinecone** | 4 vendors, 4 facturas, 4 dashboards, 4 integraciones a mantener. Tiempo de infra > tiempo de producto. |
| **Neon + Clerk + R2 + Qdrant**            | Buen stack pero misma fragmentación. Neon tiene branching serverless muy atractivo → lo revisaremos en ADR futuro si pegamos en Supabase limits. |
| **PlanetScale**                           | MySQL, sin pgvector, sin RLS — descarte directo para este modelo de datos. |
| **AWS Cognito + RDS**                     | Potente, laborioso. Dos estudiantes sin SRE → descarte.                    |

## Revisión

Esta decisión se revisa cuando:

- La DB supere 8 GB en Supabase Pro (evaluar Neon / self-host).
- `pgvector` se quede corto (> 5M chunks) → estudiar Qdrant/Pinecone separado.
- Un incidente de Supabase cause > 4 h de downtime en un mes.
