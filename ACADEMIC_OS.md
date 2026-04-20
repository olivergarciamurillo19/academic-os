# Academic OS — Master Blueprint

> SaaS académico inteligente para estudiantes de ingeniería · UAL · V1 Nov 2026
> Fundadores: Óliver García · Armando
> Ejecutor principal de código: Claude Code
> Stack: Next.js · TypeScript · Supabase · Vercel · Anthropic API

Este documento es la **fuente única de verdad** del producto. Cualquier decisión que se desvíe de aquí debe actualizar este archivo en el mismo PR. No es un plan aspiracional: es el mapa operativo que Claude Code va a ejecutar.

---

## 1 · PRODUCT VISION

### 1.1 El producto en una frase

> **Academic OS es el sistema operativo de la carrera del estudiante: un único lugar donde entran apuntes, PDFs, audios y avisos del aula virtual, y salen plans de estudio, tests generados, resúmenes y respuestas con IA sobre tu propio material.**

No es una app de notas. No es un ChatGPT con esteroides. Es la capa que conecta el aula virtual, el calendario, tus documentos y tu método de estudio, y los convierte en acción diaria.

### 1.2 El problema real

La vida académica del estudiante de ingeniería de primer año en UAL está fragmentada en mínimo **7 sistemas**:

1. Blackboard Learn Ultra (`aulavirtual.ual.es`) — materiales, tareas, avisos por asignatura.
2. Campus Virtual (`campus.ual.es`) — matrícula, notas, horarios.
3. WhatsApp de clase — la información real que nadie más tiene.
4. Google Calendar / calendario del móvil.
5. PDFs locales, fotos del iPad, apuntes a mano escaneados.
6. Exámenes antiguos compartidos en drives improvisados.
7. Cerebro del alumno (que olvida).

El coste no es "desorden estético". Es **pérdida objetiva de información**: un aviso de última hora del profesor que cambia la fecha de una entrega, una práctica opcional que valía puntos, una errata en un enunciado. Todo eso pasa varias veces por semestre y repercute en la nota.

### 1.3 Por qué ahora, por qué nosotros

- La IA generativa hace viable por primera vez el **RAG sobre tus propios apuntes** con calidad de respuesta decente, a coste razonable.
- Blackboard Ultra expone contenido vía HTML navegable, lo que permite una extensión de navegador que actúe como bridge (el camino realista — ver §9).
- Óliver y Armando son el cliente cero. Si no se usa todos los días por dos ingenieros en activo en UAL, no sirve.

### 1.4 Posicionamiento

| Competencia                    | Qué hace                        | Dónde falla para este caso                |
| ------------------------------ | ------------------------------- | ------------------------------------------ |
| Notion / Obsidian              | Notas libres                   | Cero integración con UAL, cero IA sobre tu material, cero calendario académico |
| NotebookLM                     | RAG sobre docs               | No hay calendario, no hay colaboración de clase, no hay concepto de asignatura persistente |
| Anki / Quizlet                 | Flashcards              | No entiende tu carrera, no genera, no sync |
| ChatGPT / Claude.ai directo    | Q&A             | Sin memoria por asignatura, sin tu material como contexto siempre |
| Aula virtual UAL               | Contenido oficial | UX hostil, no IA, no planifica, no avisa |

**Nuestro territorio**: el único producto donde coinciden **(a) tu material + (b) tu calendario académico + (c) IA con memoria por asignatura + (d) tu clase como red social ligera**.

### 1.5 Estrella polar (North Star)

**Número de sesiones de estudio productivas por alumno y semana**, donde "productiva" se define como: sesión ≥ 25 min + interacción con material (chat, test, notas, docs) + feedback auto-reportado positivo. Si este número no crece, el producto no funciona, da igual cuántos usuarios entren.

### 1.6 No-objetivos explícitos (V1)

Lo que **no** vamos a hacer, y decirlo aquí ahorra 6 meses de ruido:

- No vamos a sustituir al aula virtual. Convivimos.
- No vamos a hacer red social con perfiles públicos. La comunidad es **por clase**.
- No vamos a hacer mobile app nativa. PWA responsive, punto.
- No vamos a integrarnos con 20 universidades en V1. Solo UAL, solo ingeniería, solo 1º.
- No vamos a hacer marketplace de apuntes, ni venta entre alumnos.
- No vamos a hacer gamificación agresiva. Opt-in, minimalista, V2+.

---

## 2 · CORE MODULES

El sistema se divide en **5 capas** y **12 módulos funcionales**. Esta separación es la que se refleja en el repo (§13) y en el reparto de trabajo (§12).

### 2.1 Capas del sistema

```
┌──────────────────────────────────────────────────────────────┐
│ L5 · EXPERIENCE      Dashboards · Vistas · Shell responsive  │
├──────────────────────────────────────────────────────────────┤
│ L4 · INTELLIGENCE    RAG · Chat · Tests · Planner · Tutor    │
├──────────────────────────────────────────────────────────────┤
│ L3 · COLLABORATION   Canales · Hilos · Menciones · Roles     │
├──────────────────────────────────────────────────────────────┤
│ L2 · ACADEMIC CORE   Asignaturas · Calendar · Materiales · Tasks │
├──────────────────────────────────────────────────────────────┤
│ L1 · PLATFORM        Auth · Tenancy · Storage · Jobs · Sync  │
└──────────────────────────────────────────────────────────────┘
```

Regla: un módulo de Lₙ puede depender de Lₙ₋₁ o menor. **Nunca al revés.** Esto mantiene la codebase sana cuando Claude Code genera a velocidad.

### 2.2 Los 12 módulos funcionales

#### Núcleo (imprescindibles en V1)

1. **Auth & Identity** — login UAL (OAuth Google como plan B), perfiles, roles.
2. **Academic Graph** — universidad → grado → año → asignatura → tema → recurso. Esta jerarquía es la columna vertebral de todo.
3. **Calendar & Events** — calendario propio + import iCal + eventos manuales + detección de cambios.
4. **Materials** — upload y organización de PDFs, imágenes, audios, notas propias, separados por **teoría** y **práctica**.
5. **RAG & Search** — indexación vectorial + BM25 + búsqueda unificada por asignatura.
6. **Subject Chat** — chat con memoria persistente por asignatura, usando el material del alumno como contexto.
7. **Study Tasks & Reminders** — tareas, fechas, checklist, notificaciones.

#### Soporte (V1 ligero, expandir en V2)

8. **Test Generator** — generación de preguntas tipo test desde material, con corrección.
9. **Audio Transcription** — subir audio de clase → transcripción + resumen estructurado.
10. **Class Channels** — canales por asignatura, hilos, menciones, archivos compartidos.

#### Futuro (V2+ explícito, stubs de datos en V1)

11. **Adaptive Planner** — planificador que aprende del método de estudio y reubica sesiones.
12. **Analytics & Insights** — métricas de estudio reales, detección de debilidades por tema, reporting personal.

### 2.3 Módulos transversales (no features, infraestructura)

- **Sync Layer** — motor de sincronización con fuentes externas (Blackboard vía extensión, Google Calendar, iCal).
- **Notifications** — emails, push web, in-app; prioridades.
- **Observability** — logs, errors (Sentry), métricas, tracing.
- **Admin Panel** — interno, para Óliver y Armando.

---

## 3 · V1 / V2 / BACKLOG

Priorización dura. **V1 debe caber en 10-12 semanas con Claude Code como ejecutor**. Todo lo demás es ruido.

### 3.1 V1 — "Usable por nosotros dos todos los días" (semanas 1-12)

**Criterio de corte**: un alumno de UAL 1º de ingeniería puede, en V1:

- Logarse con Google.
- Crear su perfil con universidad, grado, año y cuatrimestre.
- Ver sus 5 asignaturas del cuatrimestre (creación manual con plantilla UAL).
- Cada asignatura con vistas de teoría y práctica separadas.
- Subir PDFs, imágenes y notas de texto a una asignatura.
- Preguntar al chat de la asignatura y recibir respuesta con citas a su material.
- Ver un calendario unificado con eventos propios + import iCal.
- Recibir recordatorio el día antes de una entrega.
- Todo esto en móvil sin sufrir.

**Lo que SÍ entra en V1:**

- Auth Google + email.
- Onboarding con plantilla UAL (1º Ingeniería Mecánica + Electrónica precargadas).
- Asignaturas + temas + separación teoría/práctica.
- Upload y viewer de PDFs/imágenes/texto (sin audio todavía).
- RAG funcional con pgvector.
- Chat por asignatura con memoria.
- Calendario con CRUD manual + import iCal pasivo.
- Tareas básicas con recordatorio email + push web.
- Generador de tests (versión v0: 10 preguntas tipo test por tema).
- Admin panel mínimo.
- PWA responsive pulida.

**Lo que NO entra en V1 aunque duela:**

- Transcripción de audio.
- Canales/chat de clase.
- Extensión Chrome para Blackboard.
- Corrección paso a paso de ejercicios.
- Planner adaptativo.
- Analytics más allá de contador básico.
- Onboarding de otras carreras distintas a ingeniería.

### 3.2 V2 — "Esto ya es un producto serio" (semanas 13-24)

- **Blackboard Sync Extension** (Chrome, MV3): scrapea aulavirtual.ual.es en la sesión del alumno, envía avisos/tareas/materiales al backend.
- **Audio transcription pipeline**: Whisper API → resumen estructurado → indexado en RAG.
- **Class channels**: canales por asignatura, hilos, menciones, archivos.
- **Ejercicios guiados paso a paso**: resolver problema de matemáticas/física con Claude como tutor, validando cada paso.
- **Planner adaptativo v1**: reprograma sesiones en base a tareas atrasadas y exámenes próximos.
- **Métricas de estudio** reales (horas, asignaturas débiles, mapa de calor).

### 3.3 Backlog — "Quizá nunca, pero buena idea"

- Gamificación opt-in (XP, rachas, logros).
- Ranking por clase.
- Grupos de estudio con sesiones Pomodoro compartidas.
- Integración con Notion / Obsidian export.
- Marketplace interno de apuntes validados.
- Expansión a otras carreras.
- App nativa iOS/Android.
- Versión para profesores.
- Detección automática de debilidades usando métricas de test + tiempo por tema.

### 3.4 Regla de priorización

Cuando hay dudas sobre si algo entra en V1: **¿un alumno de UAL puede aprobar un examen más fácilmente sin esta feature?** Si la respuesta es "sí", fuera de V1.

---

## 4 · TECH ARCHITECTURE

### 4.1 Stack final (decidido, no negociable sin PR)

| Capa               | Tecnología                         | Razón                                                                 |
| ------------------ | ----------------------------------- | --------------------------------------------------------------------- |
| Frontend           | Next.js 15 App Router + TS strict   | SSR/ISR, RSC, ecosistema, deploy Vercel trivial                       |
| UI Kit             | Tailwind + shadcn/ui + Radix        | Prototipado rápido, accesible, fácil de customizar para look premium  |
| Forms/Validation   | React Hook Form + Zod               | Validación compartida client/server                                   |
| State server       | TanStack Query                      | Cache de fetch, invalidaciones, optimistic UI                         |
| State client       | Zustand (solo UI global)            | No Redux. No Jotai. Simple.                                           |
| Auth               | Supabase Auth                       | OAuth Google, email magic link, JWT nativo, hooks de Next             |
| DB                 | Supabase Postgres 15                | RLS, extensions (pgvector, pg_cron, pg_net)                           |
| Vector             | pgvector                            | Mismo DB, menos superficie, coste 0 extra                             |
| Storage            | Supabase Storage                    | S3-compatible, integrado con RLS                                      |
| Realtime           | Supabase Realtime                   | Para chat de clase V2, usable en notificaciones V1                    |
| ORM                | Drizzle ORM                         | Type-safety, migraciones versionadas, no mágico                       |
| Jobs               | Inngest                             | Serverless, retries, cron, DX excelente con Next                       |
| LLM                | Anthropic API (Claude Sonnet 4.5)   | Calidad de razonamiento, memoria larga, tool use                      |
| Embeddings         | OpenAI text-embedding-3-small       | Barato, buena calidad, lenguaje mezclado ES/EN                        |
| Audio STT          | OpenAI Whisper API                  | Castellano decente, precio bueno; plan B: Deepgram                    |
| PDF parsing        | unpdf + pdf-parse + Mistral OCR     | Texto nativo primero, OCR solo si falla                               |
| Email              | Resend                              | DX limpio, dominio propio                                             |
| Push web           | Web Push Protocol nativo            | Suficiente para PWA; no app nativa                                    |
| Monitoring         | Sentry + Vercel Analytics           | Errores + rendimiento                                                 |
| Feature flags      | PostHog                             | Flags + analytics producto + session replay gratis                    |
| CI/CD              | GitHub Actions + Vercel             | Tests + typecheck + lint en PR; deploy automático                     |
| Package manager    | pnpm                                | Monorepo, workspaces, rápido                                          |
| Monorepo tooling   | Turborepo                           | Cache, pipelines paralelos                                            |
| Deploy             | Vercel (apps) + Supabase Cloud (DB) | Cero infra que mantener                                               |

### 4.2 Diagrama de alto nivel

```
                 ┌──────────────────────────────────────────────┐
 ┌────────────┐  │  Vercel Edge + Node runtime                  │
 │ Usuario    │  │  ┌──────────────────────────────────────┐   │
 │ (PWA Web)  │◄─┼─►│  Next.js 15 · App Router · RSC + API │   │
 └────────────┘  │  │  - Pages / Layouts / Server Actions  │   │
                 │  │  - Route Handlers (edge + node)      │   │
                 │  └──────────┬───────────────────────────┘   │
                 │             │                                │
                 │             │   supabase-js + Drizzle        │
                 │             ▼                                │
                 │  ┌──────────────────────────────────────┐   │
                 │  │  Supabase                            │   │
                 │  │  ├─ Auth (Google OAuth + magic link) │   │
                 │  │  ├─ Postgres 15 + RLS                │   │
                 │  │  │   └─ pgvector (embeddings)        │   │
                 │  │  ├─ Storage (S3)                     │   │
                 │  │  └─ Realtime                         │   │
                 │  └──────────────────────────────────────┘   │
                 │                                              │
                 │  ┌──────────────────────────────────────┐   │
                 │  │  Inngest (background jobs)           │   │
                 │  │  - PDF ingestion pipeline            │   │
                 │  │  - Embeddings batch                  │   │
                 │  │  - iCal sync cron                    │   │
                 │  │  - Notifications dispatch            │   │
                 │  │  - Audio transcription (V2)          │   │
                 │  └──────────────────────────────────────┘   │
                 │                                              │
                 │  ┌──────────────────────────────────────┐   │
                 │  │  External APIs                       │   │
                 │  │  - Anthropic (Claude)                │   │
                 │  │  - OpenAI (embeddings + Whisper V2)  │   │
                 │  │  - Google Calendar API (OAuth user)  │   │
                 │  │  - Resend (email)                    │   │
                 │  └──────────────────────────────────────┘   │
                 └──────────────────────────────────────────────┘
```

### 4.3 Decisiones clave justificadas

**Por qué Supabase y no Neon + Clerk + Cloudflare R2 + etc.**
Una sola cuenta, una sola consola, RLS nativa, pgvector dentro, precio predecible. Dos fundadores no pueden pelear con 6 integraciones. Cuando uno de los dos vertical se quede corto, migrar ese concreto (ej. mover Storage a R2) es un PR localizado.

**Por qué Drizzle y no Prisma.**
Prisma es más conocido pero genera código lento en serverless y su DSL esconde el SQL. Drizzle es type-safe, SQL-first, y permite usar funciones de Postgres (pgvector, RLS, triggers) sin pelear con un generador. Para un proyecto con vector + RLS, Drizzle gana.

**Por qué Inngest y no BullMQ / Trigger.dev / Resque.**
Sin infra. Retries automáticos. Crons nativos. Observabilidad decente. Plan free suficiente para V1. Migración a Trigger.dev o self-hosted es trivial si pega la factura.

**Por qué Anthropic y no OpenAI para el LLM principal.**
Claude Sonnet 4.5 es mejor razonando sobre documentos largos, sigue instrucciones estructuradas mejor, y tiene ventana de contexto grande. Para RAG sobre apuntes de ingeniería, marca diferencia. Embeddings se quedan en OpenAI porque text-embedding-3-small es barato y bueno.

**Por qué PWA y no React Native / Expo.**
Dos personas no pueden mantener 2 apps nativas + web. PWA con buena UX responsive y push notifications cubre 90% del caso. Si el producto funciona, app nativa llega en V3 con Expo + el mismo backend.

**Por qué Vercel y no self-host.**
Mismo argumento: tiempo es el recurso escaso. Vercel + Supabase = 0 infra a mantener. En 2 años, si hay tracción, se evalúa mover.

### 4.4 Organización de runtimes

```
Next.js App Router runtimes:
├─ Edge                 → páginas marketing, sitemap, webhooks simples
├─ Node (default)       → todo lo que toca Supabase con service role
└─ Server Actions       → mutaciones desde UI (RLS con auth user)

Jobs (Inngest):
├─ cron                 → sync iCal, cleanup, digest diario
├─ fanout               → notificaciones
└─ pipeline             → ingestion de documentos (parse → chunk → embed)
```

Regla: **todo lo que tarde > 5 segundos vive en Inngest, no en una ruta HTTP**. Evitar timeouts de Vercel.

### 4.5 Observabilidad desde el día 1

- Sentry con source maps activos en prod.
- Vercel Analytics para Core Web Vitals.
- PostHog para eventos de producto (`subject_created`, `chat_message_sent`, `test_generated`, `doc_uploaded`).
- Logs estructurados con `pino` en server, enviados a Axiom (free tier).
- Health check: `/api/health` devuelve estado de DB, storage, LLM, embedding.

### 4.6 CI/CD

Cada PR corre:

1. `pnpm install --frozen-lockfile`
2. `pnpm typecheck`
3. `pnpm lint`
4. `pnpm test` (Vitest unit + integration con supabase-cli local)
5. Preview deploy en Vercel
6. Migraciones validadas contra shadow DB (Drizzle `drizzle-kit check`)

Merge a `main` → deploy automático a producción. Protección de branch obliga a 1 aprobación + CI verde.

---

## 5 · MULTI-TENANT STRATEGY

### 5.1 Decisión

**Multi-tenant desde V1, pero con tenant implícito = `university_id`**. Una sola DB, RLS en cada tabla, y toda query parte de `(university_id, user_id)`.

### 5.2 Por qué no multi-schema ni multi-DB

- Multi-schema en Postgres suena bonito pero con pgvector las migraciones se vuelven pesadilla.
- Multi-DB (una DB por universidad) es overkill hasta que haya 3+ universidades con cargas reales y SLAs distintos.
- Row-level tenancy con RLS es lo que escala bien hasta miles de universidades y cientos de miles de alumnos, y es lo que usan Supabase, Linear, Notion internamente para su propia capa.

### 5.3 Jerarquía tenant

```
university (UAL)
  └─ degree_program (Grado Ingeniería Mecánica)
       └─ academic_year (1º)
            └─ cohort (2025/26 · Grupo DB)   ← "clase" en lenguaje usuario
                 └─ subject (Matemáticas I)
                      └─ members (alumnos + delegado)
```

### 5.4 Cómo se aplica RLS

Cada tabla relevante tiene `university_id` (denormalizado cuando haga falta para eficiencia) y políticas del tipo:

```sql
CREATE POLICY "users see their university data"
ON subjects FOR SELECT
USING (university_id IN (
  SELECT university_id FROM memberships WHERE user_id = auth.uid()
));
```

Los datos **privados del usuario** (apuntes, chats, tareas personales) llevan `user_id` y política `USING (user_id = auth.uid())`.

Los datos **de clase** (canales, eventos compartidos, entregas oficiales) usan `cohort_id` + membresía verificada.

### 5.5 Plan de escalado de tenants

| Fase | Usuarios | Estrategia                                                    |
| ---- | -------- | -------------------------------------------------------------- |
| V1   | <500     | Supabase free/pro, RLS, una DB                                 |
| V2   | <10k     | Supabase pro + read replicas, CDN para storage                 |
| V3   | >10k     | Evaluar partición por `university_id` (table partitioning nativo de Postgres) |
| V4   | multi-uni real | Extraer las universidades grandes a su propio pool de conexiones |

No se toca nada de esto hasta que haya datos reales de carga. **Premature scaling mata startups.**

---

## 6 · DATABASE DESIGN

### 6.1 Principios

- **Snake_case** en SQL, **camelCase** en TS. Drizzle lo mapea.
- **UUID v7** para todos los `id` (ordenables, indexables como b-tree).
- **Timestamps**: `created_at`, `updated_at` en todas las tablas; trigger para `updated_at`.
- **Soft delete** solo donde hace falta (documentos, mensajes). Hard delete para logs.
- **Todas las FK tienen índice** (Postgres no los crea solo).
- **Migraciones en `/packages/db/migrations`**, versionadas, revisables.

### 6.2 Tablas principales (V1)

Lo que sigue es el esquema real que Claude Code va a generar. Tipos simplificados por claridad, el SQL completo vive en `DB_SCHEMA.md`.

#### Identity

```
universities          (id, slug, name, country, locale, created_at)
degree_programs       (id, university_id, code, name, kind, created_at)
cohorts               (id, degree_program_id, academic_year, period, group_code, created_at)
                       -- ej: 2025/26 · 1Q · Grupo DB

users                 (id [=auth.uid], email, full_name, avatar_url,
                       preferences jsonb, study_method jsonb, created_at)

memberships           (id, user_id, university_id, degree_program_id,
                       cohort_id, role enum, status enum, joined_at)
                       -- role: student | delegate | admin
```

#### Academic graph

```
subjects              (id, cohort_id, university_id, code, name, color,
                       credits, semester, is_active, created_at)
                       -- ej: "MATEMÁTICAS I · 44101101"

subject_members       (id, subject_id, user_id, role enum, created_at)

topics                (id, subject_id, parent_topic_id nullable, order_index,
                       name, kind enum, created_at)
                       -- kind: theory | practice | lab | exam_unit

resources             (id, subject_id, topic_id nullable, kind enum,
                       title, source enum, owner_user_id,
                       storage_path, mime_type, bytes,
                       scope enum, created_at, deleted_at)
                       -- kind: pdf | image | text_note | audio | url
                       -- source: user_upload | ical_import | blackboard_sync | manual
                       -- scope: personal | subject_shared | cohort_shared
```

#### Calendar & tasks

```
events                (id, subject_id nullable, cohort_id nullable,
                       owner_user_id nullable, title, description,
                       start_at, end_at, location, kind enum,
                       source enum, external_id, color, is_all_day,
                       created_at)
                       -- kind: class | exam | deadline | study_session | personal
                       -- source: manual | ical | google_calendar | blackboard

tasks                 (id, user_id, subject_id nullable, event_id nullable,
                       title, description, due_at, status enum,
                       priority smallint, estimated_minutes, created_at,
                       completed_at)
                       -- status: todo | doing | done | archived

reminders             (id, task_id nullable, event_id nullable, user_id,
                       remind_at, channel enum, sent_at, created_at)
                       -- channel: email | push | inapp
```

#### RAG / AI

```
documents             (id, resource_id, status enum, pages int,
                       text_extracted boolean, language text,
                       processing_error text nullable, indexed_at,
                       created_at, updated_at)
                       -- status: pending | processing | indexed | failed

chunks                (id, document_id, subject_id, topic_id nullable,
                       chunk_index, content text, content_tsv tsvector,
                       embedding vector(1536), token_count int,
                       page_from int, page_to int, created_at)

conversations         (id, user_id, subject_id, title, pinned boolean,
                       created_at, updated_at)

messages              (id, conversation_id, role enum, content jsonb,
                       citations jsonb, token_usage jsonb, model text,
                       created_at)
                       -- role: user | assistant | system | tool

generated_tests       (id, user_id, subject_id, topic_id nullable,
                       title, questions jsonb, source_chunks jsonb,
                       created_at)

test_attempts         (id, generated_test_id, user_id, answers jsonb,
                       score numeric, feedback jsonb, completed_at)
```

#### Collaboration (V2 ready, schema desde V1)

```
channels              (id, cohort_id, subject_id nullable, name,
                       topic text, is_default boolean, created_at)

channel_members       (id, channel_id, user_id, last_read_at, muted boolean)

channel_messages      (id, channel_id, user_id, parent_message_id nullable,
                       content text, content_html text, attachments jsonb,
                       mentions jsonb, edited_at, deleted_at, created_at)

channel_reactions     (id, channel_message_id, user_id, emoji, created_at)
```

#### System

```
integrations          (id, user_id, provider enum, access_token encrypted,
                       refresh_token encrypted, expires_at, scopes jsonb,
                       metadata jsonb, created_at)
                       -- provider: google_calendar | ical_url | blackboard_ext

sync_jobs             (id, user_id, integration_id nullable, kind enum,
                       status enum, started_at, finished_at,
                       items_processed int, error jsonb, log jsonb)

notifications         (id, user_id, kind enum, payload jsonb,
                       read_at, sent_email_at, sent_push_at, created_at)

audit_logs            (id, user_id nullable, action text, resource_type,
                       resource_id, metadata jsonb, ip inet, created_at)

study_sessions        (id, user_id, subject_id nullable, started_at,
                       ended_at, kind enum, metadata jsonb)
                       -- kind: pomodoro | free | test | reading | chat
```

### 6.3 Índices críticos (no olvidables)

```sql
-- Búsqueda por usuario en tablas hot
CREATE INDEX idx_subjects_cohort ON subjects(cohort_id);
CREATE INDEX idx_subject_members_user ON subject_members(user_id);
CREATE INDEX idx_resources_subject_topic ON resources(subject_id, topic_id);
CREATE INDEX idx_events_owner_start ON events(owner_user_id, start_at);
CREATE INDEX idx_tasks_user_due ON tasks(user_id, due_at) WHERE status != 'done';
CREATE INDEX idx_messages_conv ON messages(conversation_id, created_at);

-- Vector + full text
CREATE INDEX idx_chunks_embedding ON chunks
  USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_chunks_fts ON chunks USING gin(content_tsv);
CREATE INDEX idx_chunks_subject ON chunks(subject_id);
```

### 6.4 Extensiones Postgres activas

```sql
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";
create extension if not exists "vector";
create extension if not exists "pg_cron";
create extension if not exists "pg_net";
```

### 6.5 Datos seed iniciales

Creados como migración desde `/packages/db/seed/ual-1-ingenieria.sql`:

- `universities`: UAL.
- `degree_programs`: Grado Ingeniería Mecánica, Grado Ingeniería Electrónica Industrial.
- `cohorts`: 2025/26 · 1Q y 2Q para cada grado.
- `subjects` plantilla (según las capturas del aula virtual):
  1Q: Expresión Gráfica, Física I, Matemáticas I, Organización y Gestión de Empresas, Química.
  2Q: Estadística, Física II, Matemáticas II, Programación, Tecnología de la Fabricación.

Un alumno al onboardearse **clona la plantilla** de su grado para su cohort. Así los profes cambian un enunciado y el alumno lo edita sin afectar a otros.

---

## 7 · PERMISSIONS & ROLES

### 7.1 Los tres roles de V1

| Rol        | Quién         | Puede                                                                                   |
| ---------- | ------------- | ---------------------------------------------------------------------------------------- |
| `student`  | Alumno        | CRUD de su propio contenido · lectura de contenido compartido de su cohort             |
| `delegate` | Delegado de clase | Todo lo anterior · crear/editar eventos de cohort · marcar cambios oficiales · moderar canales |
| `admin`    | Óliver, Armando | Todo · gestionar universidades, grados, cohorts · acceder a admin panel · banear usuarios |

**No hay "owner" ni "super-admin" hasta V2**. Simple.

### 7.2 Matriz de permisos V1 (resumida)

| Recurso                        | Student           | Delegate                    | Admin |
| ------------------------------ | ----------------- | ---------------------------- | ----- |
| Sus propios apuntes/docs       | CRUD              | CRUD                         | R     |
| Sus propias tareas y eventos   | CRUD              | CRUD                         | R     |
| Subject (plantilla clonada)    | R + editar metadata propia | Editar metadata de cohort | CRUD  |
| Eventos de cohort              | R                 | CRUD                         | CRUD  |
| Anuncios de cohort             | R                 | C + U propios                | CRUD  |
| Cambios oficiales (override)   | —                 | Marcar como "oficial"        | CRUD  |
| Canales (V2)                   | Enviar / reaccionar | Moderar / pin             | CRUD  |
| Expulsar usuario de cohort     | —                 | —                            | ✓     |

### 7.3 Cómo se evita el caos

Tres reglas escritas y enforced en DB:

1. **Un evento solo puede ser "oficial" (color visible para toda la clase) si fue creado por `delegate` o `admin`, o si vino por sync externa confirmada.** Todo lo demás es "sugerido" y solo visible al creador.
2. **Cualquier cambio en contenido de cohort deja audit log con `user_id`, `action`, `before`, `after`.** Si un delegado se pasa, se revierte en 1 clic.
3. **Un `delegate` solo puede serlo en UN cohort a la vez** y Óliver/Armando lo asignan manualmente en V1. En V2, votación por pares.

### 7.4 Onboarding de un delegado

En V1 el delegado es quien nos diga que lo es, con verificación manual. No se confía en "yo me apunto de delegado" desde UI.

---

## 8 · COLLABORATION SYSTEM

> V2 en su mayoría, pero el esquema (§6) lo soporta desde V1 para no migrar luego.

### 8.1 Modelo

- **Canales por asignatura** (1 por subject, creados automáticamente al crear la cohort).
- **Canal general de cohort** (1 por cohort).
- **Hilos** dentro de un canal (respuesta a un mensaje → thread).
- **Menciones** `@user` y `@delegados`.
- **Adjuntos** con reuso del módulo Materials (si subes PDF al canal, queda también en la biblioteca de la asignatura).
- **Reacciones** con emoji, sin más.

### 8.2 Identidad real, no pseudónima

- Identidad = nombre real del usuario + avatar.
- No se puede anonimizar en canales.
- Por qué: los canales son espacios de trabajo de clase, no redes sociales. Que haya nombres reales reduce el ruido un 80%.

### 8.3 Estrategia anti-ruido

Lo más probable es que si hacemos esto mal se convierta en un WhatsApp más. Para evitarlo:

1. **Default silencioso**: nadie está suscrito a todos los canales por defecto. Solo al canal general + canal de la asignatura si lo abres.
2. **Menciones explícitas**: las notificaciones solo saltan con `@` o con palabra clave (ej. "examen", "entrega") si el usuario la ha marcado.
3. **Sin GIFs**. Sin stickers. Texto + adjuntos con contexto.
4. **Modo "Quiet hours"** configurable por usuario.
5. **Pinning oficial**: los delegados pueden anclar un anuncio al canal; esos sí notifican a todos.
6. **Resumen diario**: un email al día con lo relevante de los canales (generado por IA), para los que no quieren estar mirando en tiempo real.

### 8.4 Por qué esto no es Slack

- Slack cobra por usuario. No.
- Slack mezcla empresa y estudios mal.
- Slack no sabe de asignaturas ni cohorts.
- Nuestro chat vive dentro del contexto académico: un mensaje que menciona "parcial del tema 3" puede enlazar al tema, al evento del parcial y al material del tema. Slack no hace eso.

### 8.5 Moderación

- Auto-moderación básica (lenguaje ofensivo) con un filtro simple, no IA en V2.
- Reporte → admin review.
- Ban temporal por delegate, permanente por admin.

---

## 9 · CALENDAR + UNIVERSITY SYNC

Aquí hay que ser sobrio. **Esta es la parte más frágil del producto**, y vender humo aquí rompe la confianza del alumno.

### 9.1 Realidad de la integración con UAL

- **`aulavirtual.ual.es` es Blackboard Learn Ultra (Anthology)**. Confirmado.
- Blackboard tiene REST API (`/learn/api/public/v1/...`) pero **requiere credenciales de aplicación otorgadas por la universidad**. UAL no va a dárnoslas a dos estudiantes. Punto.
- Blackboard Ultra **sí** expone exportación de calendario por usuario en formato iCal (`.ics`) desde la vista "Calendar". Esa URL es personal y se puede reutilizar.
- Campus Virtual UAL (`campus.ual.es`) tiene SSO con CAS. Sin API pública documentada.

**Conclusión**: no hay integración "oficial" disponible. Hay que construir una sync layer que combine tres caminos reales:

### 9.2 Estrategia realista por capas

#### 9.2.1 Capa A — iCal feed (V1, viable hoy)

Blackboard Ultra permite al usuario obtener una URL iCal privada de su calendario. En el onboarding pedimos esa URL, la guardamos en `integrations` con `provider = ical_url`, y un cron de Inngest la refresca cada 30 min.

- Pros: funciona sin permisos especiales.
- Contras: no trae avisos de novedades, solo eventos. No trae cambios manuales de profesores fuera del calendario.

#### 9.2.2 Capa B — Google Calendar sync (V1)

OAuth de Google con scope `calendar.readonly` (o `calendar` si queremos escribir). Un cron lee cambios y los refleja. Muchos alumnos ya tienen el calendario UAL importado en Google.

- Pros: trivial, fiable, bidireccional si queremos.
- Contras: depende de que el alumno ya tenga sincronizado UAL en Google.

#### 9.2.3 Capa C — Chrome Extension "UAL Bridge" (V2, donde está el valor)

Extensión MV3 que el alumno instala. Mientras navega por `aulavirtual.ual.es`:
- Captura listado de cursos.
- Captura avisos nuevos publicados por profesores.
- Captura tareas y sus fechas.
- Detecta cambios (diff contra última visita).
- Envía los cambios al backend vía endpoint autenticado (`/api/sync/blackboard` con JWT del alumno).

Técnicamente es scraping del HTML renderizado de Blackboard Ultra dentro del propio contexto de sesión del alumno. **Legalmente es gris pero defendible**: el alumno da permiso explícito, el alumno ya tiene acceso legítimo al contenido, y el contenido no sale de los servidores de UAL hacia terceros sin consentimiento.

- Pros: única forma de capturar avisos de profesor en tiempo casi real.
- Contras: frágil (si Blackboard cambia su HTML, se rompe); requiere que el alumno entre al aula virtual; mantenimiento constante.

#### 9.2.4 Capa D — Input manual (siempre disponible)

Los profesores cambian las cosas por email, WhatsApp, o de palabra en clase. **El 100% de lo importante debe ser editable a mano** con un UX rapidísimo:
- Swipe en móvil para cambiar fecha de un evento.
- Botón "Marcar cambio oficial" que solo ven delegados/admin.
- Entrada rápida por texto libre ("mañana entrega lab física a las 18") → LLM parsea → crea evento.

### 9.3 Resolución de conflictos

Cuando una misma entidad llega por dos canales (ej: un examen está en iCal y también lo creó el delegado manualmente):

1. Si tiene mismo `external_id` → update in place.
2. Si no, fuzzy match por (título ~ título AND abs(start - start) < 2h) → merge con log.
3. Si hay divergencia no resoluble → duplicado marcado como `conflict=true`, UI muestra ambos y pide al usuario decidir.

Todo change set queda en `sync_jobs.log` para debugging.

### 9.4 Detección inteligente de cambios

Cuando llega un evento ya existente con cambios:
- Diff campo por campo.
- Si el cambio afecta a fecha/hora/lugar → **push notification "⚠️ Cambio en tu calendario: Matemáticas I movido a Jueves 18:00"**.
- Si el cambio afecta a descripción → silencioso, solo badge de "nuevo" en UI.

### 9.5 Riesgos técnicos honestos

| Riesgo                                                     | Probabilidad | Mitigación                                                               |
| ---------------------------------------------------------- | ------------ | ------------------------------------------------------------------------- |
| Blackboard cambia su HTML y la extensión se rompe          | Alta (anual) | Tests de contrato en CI que lancen la extensión contra HTML fixture; alertas Sentry desde la extensión |
| UAL bloquea IPs o user agents scrapers                     | Baja (extensión corre en el navegador del usuario) | Si pasa, degradar a solo iCal + input manual                          |
| iCal URL del alumno expira / cambia                        | Media        | UI para re-ingresar URL con un clic; test periódico                      |
| Google Calendar scope demasiado amplio asusta al usuario   | Media        | Pedir solo `calendar.readonly` en V1, escalar si se necesita             |
| Duplicados en el calendario por mala dedupe                | Alta al principio | Marcar todo con `source` y `external_id`, agresivo merge + UI para "unir" |

### 9.6 Qué NO prometer al alumno

- No decimos "sincronizado con UAL". Decimos "lee tu calendario UAL vía iCal".
- No decimos "tiempo real". Decimos "actualizado cada X minutos" explícitamente.
- No decimos "automático". Decimos "con un clic te conectas".

### 9.7 Plan B si ninguna integración funciona

Si en las primeras 3 semanas las capas A y B dan menos del 80% de eventos que nosotros tenemos en nuestro calendario real, el producto pivota a **"organizador manual asistido por IA"** y la integración pasa a V3. Esto es un circuit-breaker honesto, no un cop-out.

---

## 10 · AI SYSTEM DESIGN

### 10.1 Capas del sistema de IA

```
┌───────────────────────────────────────────────────────┐
│ FEATURES        Subject Chat · Tests · Planner ·      │
│                 Exercise tutor · Audio summary        │
├───────────────────────────────────────────────────────┤
│ ORCHESTRATION   Prompts · Tools · Memory · Router     │
├───────────────────────────────────────────────────────┤
│ RETRIEVAL       Hybrid (BM25 + vector) · Reranker     │
├───────────────────────────────────────────────────────┤
│ INGESTION       Parse · Chunk · Embed · Index         │
├───────────────────────────────────────────────────────┤
│ MODELS          Claude Sonnet 4.5 · Haiku 4.5 ·       │
│                 OAI embeddings · Whisper              │
└───────────────────────────────────────────────────────┘
```

Cada capa es independiente y tiene su paquete en el monorepo.

### 10.2 Prompts (separación estricta)

Los prompts viven en `/packages/ai/prompts/*.ts`, son **constantes tipadas con Zod** para las variables que inyectan. Nunca se construyen strings en línea en features. Ejemplos:

```ts
// /packages/ai/prompts/subject-chat.ts
export const subjectChatSystemPrompt = (ctx: {
  subjectName: string;
  subjectCode: string;
  userName: string;
  studyMethod: StudyMethodProfile;
  retrievedChunks: Chunk[];
}) => `...prompt here...`;
```

Cambios en prompts son **PRs revisables**, no edits silenciosos. Cada prompt crítico tiene un eval set mínimo en `/packages/ai/evals`.

### 10.3 Tools (function calling)

Claude llama a tools que son server actions internas tipadas. Listado V1:

- `search_subject_materials(query, topK)` — búsqueda RAG híbrida en la asignatura actual.
- `create_task(title, dueAt, subjectId)` — crea tarea en el panel del alumno.
- `create_event(title, start, end, kind)` — crea evento.
- `open_resource(resourceId)` — abre un PDF/nota en viewer.
- `generate_test(topicId, numQuestions, difficulty)` — lanza generador de tests.

V2 añade: `start_study_session`, `transcribe_audio_resource`, `summarize_week`, `explain_step_by_step`.

**Cada tool devuelve JSON estructurado + efectos verificables**. El LLM no "cree" que creó algo: hay un registro en DB.

### 10.4 Memoria

Hay **tres memorias** bien diferenciadas:

1. **Short-term (conversacional)** — últimos N mensajes de la conversación actual. Limitado a 24 turnos o ~4k tokens.
2. **Long-term por asignatura** — resumen estructurado actualizado (jsonb en `conversations.summary`) tras cada N turnos. Contiene: conceptos discutidos, dudas recurrentes, errores típicos del alumno, nivel actual.
3. **Perfil del alumno** — `users.study_method` jsonb con: horas típicas de estudio, tipo de aprendizaje preferido (visual/ejercicios/lectura), asignaturas débiles, preferencia de explicación (breve vs detallada). Se actualiza con feedback explícito (botones thumbs) e implícito (tiempo en chat, tests acertados).

**La memoria no es magia**: es una tabla `conversations.summary` con un JSON estructurado que Claude rellena con un prompt dedicado cada X mensajes.

### 10.5 Retrieval (RAG real, no fake)

Pipeline de ingestion de un documento:

```
User uploads PDF
  ↓  (Server Action)
Create resource + document (status=pending)
  ↓  (Inngest job)
1. Parse text (unpdf → pdf-parse → fallback Mistral OCR si <5% texto extraído)
2. Detect language
3. Clean (drop headers/footers, fix hyphens, normalize whitespace)
4. Chunk (recursive character splitter, 500-800 tokens, 50 token overlap,
   respetando secciones si hay headings)
5. For each chunk:
   - Generate tsvector (español/inglés multilingual config)
   - Embed with text-embedding-3-small
6. Bulk insert chunks
7. Update document.status = indexed
8. Emit event `document.indexed` for UI
```

Retrieval en runtime (chat o test):

```
1. Expand user query (LLM Haiku genera 3 variaciones: literal, conceptual, ES↔EN)
2. For each variation: vector search (top 20) + BM25 (top 20) limitado a subject_id
3. RRF fusion (Reciprocal Rank Fusion)
4. Rerank top 30 con cross-encoder (jinaai/jina-reranker-v2 via API barata, o Cohere Rerank)
5. Return top 8 con score + snippet + page + source resource
```

**Cada respuesta del chat cita chunk_id y página** en `messages.citations`. En UI → click → abre el PDF en el punto exacto.

### 10.6 Explicación de teoría

Prompt dedicado que recibe: tema, chunks relevantes, perfil de estudio del alumno. Output: explicación estructurada con secciones "intuición", "formalización", "ejemplo trabajado", "errores comunes", "preguntas para autocomprobación".

### 10.7 Resolución guiada de ejercicios (V2)

Tool dedicada `tutor_mode(problem, subject)`:

1. Extrae el enunciado (texto o imagen OCR).
2. Identifica el tipo de problema (heurística + chunks del tema).
3. Propone **primera pista**, no la solución.
4. Espera respuesta del alumno.
5. Valida con razonamiento + verificación simbólica si aplica (SymPy server-side para mates, motor unidades para física).
6. Sigue hasta solución completa.

**Clave**: nunca suelta la solución sin ver que el alumno se ha atascado. El prompt lo obliga.

### 10.8 Generación de tests

- Input: `topicId`, `difficulty` (easy/medium/hard), `numQuestions` (5-20), tipo (multiple choice / short answer / numeric / true false).
- Pipeline:
  1. Recupera chunks del topic (§10.5).
  2. Prompt dedicado pide N preguntas en JSON Zod-validado con: enunciado, opciones, respuesta correcta, explicación, `source_chunk_ids`.
  3. Valida con Zod + segundo pass "¿la pregunta es contestable solo con los chunks?" (autocrítica Haiku).
  4. Guarda en `generated_tests`.
- Attempt guardado en `test_attempts` con feedback por pregunta.
- **Las preguntas falladas alimentan la lista de "temas débiles"** del perfil, que influye en el planner.

### 10.9 Análisis de apuntes/PDFs

Trigger: al subir un doc, además de indexarlo, job `analyze_resource` genera:
- Resumen estructurado (1-2 párrafos + bullets).
- Lista de temas detectados (mapeo a `topics` existentes o sugerencia de nuevos).
- Conceptos clave.
- Dificultad estimada.

Se almacena en `documents.analysis` jsonb. UI lo muestra al abrir el recurso.

### 10.10 Transcripción y análisis de audio (V2)

- Upload audio → Whisper API → transcripción con timestamps.
- Segmentación por pausa > 3s o cambio de hablante (si Whisper lo da).
- Generación de "acta de clase": resumen + bullets + dudas detectadas ("X no quedó claro") + deberes mencionados.
- Indexado en RAG como cualquier otro recurso.

### 10.11 Planificador adaptativo (V2)

Input: eventos próximos (exámenes/entregas), tareas pendientes, perfil del alumno, sesiones de estudio históricas.
Output: propuesta de sesiones de estudio en el calendario para los próximos 7-14 días, con tema concreto y duración.

Se corre como cron nocturno + on-demand. El alumno puede aceptar, modificar o ignorar cada sesión. El sistema aprende: si siempre ignoras las sesiones de 6am, deja de proponerlas.

### 10.12 Detección de debilidades

No es magia. Es:
- % de respuestas correctas por topic en tests.
- Tiempo medio por chunk del topic en lectura.
- Frecuencia de preguntas repetidas sobre el mismo concepto en chat.
- Menciones en transcripciones de clase ("no entendí X").

Un job diario actualiza `user_topic_mastery` (tabla V2). El planner lee de aquí.

### 10.13 Coste y control

- Cada request a LLM pasa por un middleware que registra `token_usage` y `cost_cents` en `messages`.
- Límites blandos en `users.preferences`: `max_daily_ai_requests` default 200.
- Cuando se supera, degrada a Haiku en vez de bloquear.
- Alerta en admin panel si un usuario concreto consume anormalmente (posible loop o abuso).

### 10.14 Evals

`/packages/ai/evals` contiene:
- `subject-chat.eval.ts` — 20 preguntas reales sobre materiales de ejemplo, con answers esperadas.
- `test-gen.eval.ts` — valida que las preguntas generadas son responsables solo con los chunks.
- `retrieval.eval.ts` — recall@8 sobre un set de (query, expected_chunk_ids).

Corren manualmente antes de cambiar prompts críticos. No están en CI principal (lentos y caros), sí en un workflow manual.

---

## 11 · USER EXPERIENCE

### 11.1 Principios de diseño

1. **Mobile-first real**. El viewport base es 390×844 (iPhone 15). Si no se siente nativo en móvil, no está listo.
2. **Densidad calculada**. Ni "airy SaaS vacío" ni "hoja de cálculo". Tipografía seria, espacios medidos.
3. **Contenido siempre en primera línea**. Los controles (filtros, add, etc.) van a bordes. Lo que importa — apuntes, chat, calendario — manda el espacio.
4. **Un color por asignatura**, consistente en todas las vistas (tomando los colores de la plantilla UAL que ya usan en aulavirtual).
5. **Transiciones con propósito**. Framer Motion solo para cambios de estado importantes, no decoración.
6. **Modo oscuro first-class**. Muchos estudiamos de noche.
7. **Accesibilidad WCAG AA** desde el día 1, no retrofitted.

### 11.2 Estructura de navegación (V1)

```
Shell
├─ Top bar        Logo · Search global · Notificaciones · Avatar menu
├─ Left rail (desktop) / Bottom nav (móvil)
│   ├─ Home (Dashboard)
│   ├─ Asignaturas
│   ├─ Calendario
│   ├─ Tareas
│   └─ Más... (settings, admin si admin)
└─ Content area
```

En móvil: bottom nav con 4 ítems (Home, Asignaturas, Calendario, Más). Bot flotante de "+" para crear rápido (evento, tarea, nota, subir doc) en cualquier pantalla.

### 11.3 Pantallas clave

#### Dashboard (Home)

- **Próximas 48h**: cards con exámenes, entregas, clases relevantes.
- **Continuar estudiando**: última conversación abierta, último recurso leído.
- **Foco del día**: sugerencia de sesión de 25 min (Pomodoro) sobre un topic.
- **Avisos recientes** del cohort (delegado + sync).

#### Vista asignatura

Tabs: **Resumen · Teoría · Práctica · Chat · Calendario · Tests**.

- **Resumen**: próxima clase, próxima entrega, temas vistos, progreso estimado.
- **Teoría**: árbol de topics (theory kind) con sus recursos; filtros por tipo de recurso.
- **Práctica**: árbol de topics (practice/lab kind) con entregables.
- **Chat**: conversaciones persistentes. Una por asignatura activa al entrar; usuario puede crear más (ej. "dudas examen parcial 1").
- **Calendario**: eventos filtrados a esta asignatura.
- **Tests**: tests generados, attempts, temas débiles.

#### Calendario global

- Vista mes (desktop) / agenda (móvil default) / día.
- Filtros por asignatura (pills con color).
- Fuentes visibles con icono (manual / iCal / Google / Blackboard).
- Click en evento → modal con acciones rápidas (crear tarea, añadir sesión estudio previa, compartir con cohort si delegado).

#### Tareas

- Columnas Kanban (todo/doing/done) en desktop, lista en móvil.
- Agrupar por asignatura o por fecha.
- Swipe para mover estado en móvil.

#### Subida de material

- Drag & drop web, botón "+" en móvil con opciones: Foto, PDF, Audio (V2), Texto, URL.
- Fase 1 sube. Fase 2 muestra progreso de indexado con estados claros ("analizando 25%"). Fase 3 muestra análisis automático.

### 11.4 Primer día de uso (onboarding)

Objetivo: en 90 segundos, el alumno debe estar subiendo un PDF y preguntándole al chat.

1. Login Google.
2. "¿En qué universidad estás?" → UAL preseleccionado.
3. "¿Qué grado y año?" → plantilla se carga.
4. "Confirma tus asignaturas del cuatrimestre actual" → marca/desmarca de una lista.
5. (Opcional) "¿Tienes tu URL iCal del aula virtual?" — con un tutorial de 3 pasos de cómo obtenerla. Saltable.
6. "Sube tus primeros apuntes" — drop zone con sugerencia de 1 PDF por asignatura.
7. Dashboard cargado con tour de 4 tooltips.

### 11.5 Feedback loop visual

- Skeleton loaders en vez de spinners.
- Optimistic UI en todas las mutaciones rápidas.
- Progreso de ingestion de documentos visible en tiempo real vía Supabase Realtime.
- Toast system uniforme para confirmaciones/errores.

### 11.6 "Premium" sin caer en "SaaS genérico"

- Tipografía: Inter display + Söhne mono para código (o similares gratis: Geist Sans + Geist Mono).
- Bordes sutiles (1px con color neutro-200), no sombras grandes.
- Sistema de color basado en un azul UAL-friendly + paleta OKLCH para contrastes predecibles.
- Micro-interacciones: hover states claros, focus rings visibles, cursor progress durante ops.
- Zero iconos "gratis" de FontAwesome. Todo Lucide (ya incluido con shadcn).

---

## 12 · COLLABORATIVE DEVELOPMENT PLAN

Dos personas en el mismo repo pueden multiplicarse o paralizarse mutuamente. Diseñamos por **ownership de features**, no por capas, con reglas duras para evitar pisarnos.

### 12.1 Ownership inicial

| Área                          | Owner     | Backup   |
| ----------------------------- | --------- | -------- |
| Auth + Onboarding             | Armando   | Óliver   |
| DB schema + migraciones + RLS | Armando   | Óliver   |
| Sync layer (iCal, Google)     | Armando   | Óliver   |
| Notifications infra            | Armando   | Óliver   |
| Jobs infra (Inngest)          | Armando   | Óliver   |
| RAG ingestion pipeline        | Óliver    | Armando  |
| Subject chat feature          | Óliver    | Armando  |
| Test generator feature        | Óliver    | Armando  |
| UI shell + design system      | Óliver    | Armando  |
| Dashboard + asignatura views  | Óliver    | Armando  |
| Admin panel                   | Armando   | Óliver   |
| Docs y prompts de Claude Code | Óliver    | Armando  |

**Regla**: el owner decide la arquitectura interna del módulo. Backup revisa PRs. Nadie escribe features en módulos ajenos sin acordarlo.

### 12.2 Trabajo en paralelo sin pisarse

- Cada feature se desarrolla en **su propia subcarpeta** (ver §13). Si dos features tocan el mismo archivo, uno bloquea al otro. Evitar que dos PRs abiertos toquen el mismo fichero.
- **Base compartida (ui, db, ai)** se modifica solo vía PR revisado por el otro.
- **Migraciones DB** son serializadas: solo una abierta a la vez. Se avisa por mensaje al empezar, se cierra al mergear. (Esto evita conflictos de numeración y dependencias.)
- **Design system** (shadcn components, theme, primitives) es zona "frozen" tras semana 2: si quieres tocar un `Button` base, PR con justificación.

### 12.3 Branch strategy

Simple. **Trunk-based con feature branches cortas**:

- `main` protegida. No se commitea directo.
- `feat/<scope>-<short-desc>` — features.
- `fix/<scope>-<short-desc>` — bugs.
- `chore/<...>` — dependencias, configs, refactors triviales.
- `docs/<...>` — solo documentación.

Ramas vivas ≤ 3 días. Si una rama pasa de 5 días, toca partirla en subfeatures.

### 12.4 PR rules

- Máx. ~500 líneas netas por PR. Si pasa, lo partes.
- Descripción con: qué, por qué, cómo probar, screenshots si hay UI.
- 1 aprobación requerida del otro.
- CI verde obligatorio.
- Auto-merge cuando verde + aprobado (activar en GitHub).
- No mergear un PR sin haber corrido la feature localmente al menos una vez.

### 12.5 Commits

Conventional commits estrictos:

```
feat(subjects): add theory/practice tab split
fix(calendar): handle iCal TZID properly
chore(deps): bump next to 15.1
docs(architecture): clarify RAG pipeline
refactor(ai): extract prompt builders
```

Mensajes en inglés para cohesión con código. Bodies en español si necesitamos matizar.

### 12.6 Definition of Done (DoD)

Un PR está DONE cuando:

1. Código pasa typecheck + lint + tests.
2. Tests nuevos si hay lógica nueva (happy path mínimo).
3. No hay TODOs sin issue ligado.
4. Migraciones aplicadas y reversibles.
5. Flags de producto añadidos si la feature es gradual.
6. Screenshot o video si afecta UI.
7. Docs actualizados si cambia comportamiento público.
8. Analytics events emitidos si es un flujo importante.

### 12.7 Rituales mínimos

- **Lunes 15 min**: qué voy a hacer esta semana (escrito en Discord/WhatsApp, no reunión).
- **Viernes 20 min** (síncrono, voz): review de la semana, decisiones abiertas, siguiente semana.
- **Ad-hoc**: pair programming cuando algo bloquea > 1h.

### 12.8 Decisiones técnicas

Cuando hay duda: **ADR** (Architecture Decision Record) corta en `/docs/adr/NNN-title.md`. Template de 10 líneas: contexto, opciones, decisión, consecuencias. No más. Nada de ADRs de "cómo llamamos a este botón".

---

## 13 · REPOSITORY STRUCTURE

Monorepo con pnpm workspaces + Turborepo. Una sola app web en V1; preparado para añadir `admin`, `extension`, `mobile` sin refactor mayor.

```
academic-os/
├─ .github/
│  ├─ workflows/
│  │  ├─ ci.yml                       # typecheck + lint + test + preview
│  │  ├─ db-check.yml                 # drizzle-kit check en PR
│  │  └─ release-please.yml           # changelogs automáticos
│  ├─ ISSUE_TEMPLATE/
│  │  ├─ bug.yml
│  │  ├─ feature.yml
│  │  └─ task.yml
│  ├─ PULL_REQUEST_TEMPLATE.md
│  └─ CODEOWNERS
│
├─ apps/
│  ├─ web/                            # Next.js 15 principal
│  │  ├─ src/
│  │  │  ├─ app/                      # App Router
│  │  │  │  ├─ (marketing)/           # landing, pricing futura
│  │  │  │  ├─ (auth)/                # login, callback
│  │  │  │  ├─ (app)/                 # shell autenticado
│  │  │  │  │  ├─ layout.tsx
│  │  │  │  │  ├─ dashboard/
│  │  │  │  │  ├─ subjects/
│  │  │  │  │  │  └─ [subjectId]/
│  │  │  │  │  │     ├─ theory/
│  │  │  │  │  │     ├─ practice/
│  │  │  │  │  │     ├─ chat/
│  │  │  │  │  │     ├─ tests/
│  │  │  │  │  │     └─ calendar/
│  │  │  │  │  ├─ calendar/
│  │  │  │  │  ├─ tasks/
│  │  │  │  │  └─ settings/
│  │  │  │  ├─ admin/                 # solo role=admin
│  │  │  │  ├─ api/                   # route handlers
│  │  │  │  │  ├─ ai/
│  │  │  │  │  ├─ sync/
│  │  │  │  │  ├─ webhooks/
│  │  │  │  │  └─ health/
│  │  │  │  ├─ layout.tsx
│  │  │  │  └─ globals.css
│  │  │  ├─ features/                 # Lógica de UI por dominio
│  │  │  │  ├─ auth/
│  │  │  │  ├─ subjects/
│  │  │  │  ├─ calendar/
│  │  │  │  ├─ materials/
│  │  │  │  ├─ chat/
│  │  │  │  ├─ tests/
│  │  │  │  ├─ tasks/
│  │  │  │  └─ notifications/
│  │  │  ├─ components/               # Componentes genéricos app-level
│  │  │  ├─ lib/                      # Utils específicos de la app
│  │  │  ├─ hooks/
│  │  │  ├─ actions/                  # Server actions por dominio
│  │  │  └─ middleware.ts
│  │  ├─ public/
│  │  ├─ next.config.mjs
│  │  ├─ tsconfig.json
│  │  └─ package.json
│  │
│  └─ jobs/                           # Inngest functions (runtime aparte opcional)
│     └─ src/
│        ├─ ingestion/
│        ├─ sync/
│        ├─ notifications/
│        └─ analytics/
│
├─ packages/
│  ├─ db/                             # Drizzle schema + migrations + client
│  │  ├─ src/
│  │  │  ├─ schema/                   # un archivo por dominio
│  │  │  │  ├─ identity.ts
│  │  │  │  ├─ academic.ts
│  │  │  │  ├─ materials.ts
│  │  │  │  ├─ ai.ts
│  │  │  │  ├─ collaboration.ts
│  │  │  │  └─ system.ts
│  │  │  ├─ policies/                 # RLS SQL por dominio
│  │  │  ├─ seed/
│  │  │  └─ client.ts
│  │  ├─ migrations/
│  │  └─ drizzle.config.ts
│  │
│  ├─ auth/                           # Helpers Supabase Auth + roles
│  ├─ ai/                             # Todo lo IA
│  │  ├─ src/
│  │  │  ├─ prompts/
│  │  │  ├─ tools/
│  │  │  ├─ models/                   # clientes Anthropic/OpenAI
│  │  │  ├─ ingestion/                # parse · chunk · embed
│  │  │  ├─ retrieval/                # search híbrida + rerank
│  │  │  ├─ chat/                     # orquestador de conversaciones
│  │  │  ├─ tests-gen/
│  │  │  ├─ transcription/            # V2
│  │  │  └─ evals/
│  │  └─ package.json
│  ├─ ui/                             # shadcn/ui + custom components
│  │  ├─ src/
│  │  │  ├─ components/               # ui primitives
│  │  │  ├─ blocks/                   # compuestos reutilizables
│  │  │  └─ styles/
│  │  └─ package.json
│  ├─ integrations/                   # iCal, Google Calendar, Blackboard (V2)
│  │  └─ src/
│  │     ├─ ical/
│  │     ├─ google-calendar/
│  │     └─ blackboard/               # extension bridge V2
│  ├─ email/                          # Templates + Resend client
│  ├─ notifications/                  # Push web + in-app
│  ├─ shared/                         # Tipos, enums, utils puros
│  │  └─ src/
│  │     ├─ types/
│  │     ├─ constants/
│  │     └─ utils/
│  ├─ config-eslint/
│  ├─ config-ts/
│  └─ config-tailwind/
│
├─ docs/
│  ├─ README.md
│  ├─ PRODUCT.md
│  ├─ ARCHITECTURE.md
│  ├─ DB_SCHEMA.md
│  ├─ ROADMAP.md
│  ├─ CONTRIBUTING.md
│  ├─ TASKS.md
│  ├─ PROMPTS.md
│  ├─ RUNBOOK.md
│  ├─ SECURITY.md
│  ├─ adr/
│  │  └─ 001-why-supabase.md
│  └─ setup/
│     ├─ MAC_SETUP.md                 # Óliver usa Mac → instrucciones Mac-first
│     ├─ ENV_VARS.md
│     └─ SUPABASE_LOCAL.md
│
├─ scripts/
│  ├─ dev.sh                          # arranca todo local (supabase + next + inngest)
│  ├─ seed.ts                         # seed DB para dev
│  ├─ check-migrations.ts
│  └─ reset-db.sh
│
├─ tests/
│  └─ e2e/                            # Playwright (smoke tests de flujos críticos)
│
├─ .env.example
├─ .gitignore
├─ .nvmrc
├─ package.json
├─ pnpm-workspace.yaml
├─ turbo.json
└─ tsconfig.base.json
```

### 13.1 Justificación rápida

- **Apps separadas** (`web`, `jobs`) para aislar runtimes. En V2, `admin` y `extension` se añaden sin tocar.
- **`features/` dentro de `web`** y no en `packages/` porque son específicas del shell de la app. Solo se extrae a paquete cuando se usa en dos apps.
- **`packages/ai`, `packages/db`** sí como paquetes: los usarán `jobs`, `admin`, eventualmente `extension`.
- **Un archivo por dominio** en schema/prompts/policies, no archivos de 2000 líneas.
- **`docs/`** arriba del todo, no escondido. La documentación es ciudadano de primera.

### 13.2 Paths alias

En `tsconfig.base.json`:

```
"paths": {
  "@ui/*": ["packages/ui/src/*"],
  "@db/*": ["packages/db/src/*"],
  "@ai/*": ["packages/ai/src/*"],
  "@shared/*": ["packages/shared/src/*"],
  "@integrations/*": ["packages/integrations/src/*"],
  "@/*": ["apps/web/src/*"]
}
```

---

## 14 · DOCUMENTATION TO CREATE FIRST

Lista exacta, en orden. Creadas en semana 1, vivas todo el proyecto.

### 14.1 Críticos (semana 1)

1. **`README.md`** (raíz) — Qué es, cómo correrlo local en 5 minutos en Mac, links a docs.
2. **`docs/PRODUCT.md`** — Este documento simplificado + user stories + personas.
3. **`docs/ARCHITECTURE.md`** — §4, §5, §10 de este documento, mantenido.
4. **`docs/DB_SCHEMA.md`** — SQL exhaustivo + diagrama ERD + glosario.
5. **`docs/ROADMAP.md`** — §3 y §16.
6. **`docs/CONTRIBUTING.md`** — §12, branch rules, commit rules, PR rules, DoD.
7. **`docs/TASKS.md`** — §17 + entregable B (issues iniciales).
8. **`docs/PROMPTS.md`** — Entregable E (prompts para Claude Code).
9. **`docs/setup/MAC_SETUP.md`** — Instalación Mac desde cero (brew, node, pnpm, supabase cli, docker desktop, etc.).
10. **`docs/setup/ENV_VARS.md`** — Variables, de dónde sacarlas.

### 14.2 Importantes (semana 2)

11. **`docs/RUNBOOK.md`** — Qué hacer si algo se rompe: deploy falló, DB down, LLM rate-limited, sync no va.
12. **`docs/SECURITY.md`** — Modelo de amenazas, manejo de secretos, política de privacidad interna.
13. **`docs/adr/001-why-supabase.md`** — Primera ADR como template.
14. **`docs/setup/SUPABASE_LOCAL.md`** — Cómo correr Supabase local, cargar seeds, resetear.

### 14.3 Vivos continuamente

15. **`docs/adr/*`** — Cada decisión no trivial.
16. **`docs/changelogs/*`** — Generados automáticamente por release-please.

### 14.4 Regla

Si una duda sobre el sistema se responde 2 veces en chat, la respuesta va a docs. Si una decisión se toma sin doc, no existe.

---

## 15 · INITIAL GITHUB SETUP

### 15.1 Repo setup (primeros 20 minutos)

1. Crear repo `academic-os` privado, sin README, sin .gitignore (los metemos nosotros).
2. Añadir a Óliver y Armando como admins.
3. Proteger `main`:
   - Require PR with 1 approval.
   - Require status checks: `CI / typecheck`, `CI / lint`, `CI / test`, `CI / db-check`.
   - Require branches up to date before merging.
   - Linear history on.
   - Block force pushes.
4. Activar auto-merge.
5. Activar Dependabot para npm.
6. Añadir secrets del repo:
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_URL`
   - `ANTHROPIC_API_KEY`
   - `OPENAI_API_KEY`
   - `RESEND_API_KEY`
   - `INNGEST_SIGNING_KEY` / `INNGEST_EVENT_KEY`
   - `SENTRY_AUTH_TOKEN`
   - `POSTHOG_KEY`
   - `VERCEL_TOKEN` (si CI deploy manual)

### 15.2 Labels (fijar al inicio)

Type: `type:feat`, `type:fix`, `type:chore`, `type:docs`, `type:refactor`, `type:test`.
Scope: `scope:db`, `scope:auth`, `scope:ui`, `scope:ai`, `scope:sync`, `scope:infra`.
Priority: `P0`, `P1`, `P2`, `P3`.
Status: `needs-design`, `ready`, `blocked`, `in-progress`, `in-review`.
Misc: `good-first-issue`, `claude-code-ready`, `security`, `breaking`.

### 15.3 Milestones

- `V1 — Alpha interno` (semana 6): todo el core funcionando para Óliver + Armando.
- `V1 — Beta amigos` (semana 10): 10-20 alumnos UAL reales.
- `V1 — Public UAL 1º` (semana 14): abrimos a toda 1º de ingeniería UAL.
- `V2 — Sync + Collab` (semana 24).

### 15.4 Project board

**GitHub Projects (beta/v2)** con vistas:

- **Roadmap** (vista de cronograma) — milestones.
- **Sprint actual** (vista tabla) — filtro por `milestone = current` y `status != done`.
- **Por owner** — Óliver vs Armando, para ver carga.
- **Bugs** — todos los `type:fix` abiertos.

### 15.5 Issue templates

Dos templates concretos, sin decoración:

**Feature (feature.yml)**:

```yaml
name: Feature
description: Nueva funcionalidad
labels: ["type:feat"]
body:
  - type: textarea
    id: goal
    attributes: { label: "Objetivo", description: "Qué problema resuelve" }
    validations: { required: true }
  - type: textarea
    id: context
    attributes: { label: "Contexto" }
  - type: textarea
    id: tasks
    attributes: { label: "Tareas", description: "Checklist" }
  - type: textarea
    id: acceptance
    attributes: { label: "Criterios de aceptación" }
    validations: { required: true }
  - type: textarea
    id: dependencies
    attributes: { label: "Dependencias" }
```

**Task (task.yml)** similar pero sin "objetivo", más operativo.

**Bug (bug.yml)**: qué pasó, qué debía pasar, reproducción, entorno.

### 15.6 PR template

```md
## Qué
Breve descripción de los cambios.

## Por qué
Issue(s) ligado(s): #NN

## Cómo probar
Pasos específicos.

## Screenshots / vídeos
(si UI)

## Checklist
- [ ] Tipado pasa
- [ ] Lint pasa
- [ ] Tests pasan (y añadidos si aplica)
- [ ] Migraciones reversibles (si aplica)
- [ ] Docs actualizados (si aplica)
- [ ] Analytics events emitidos (si aplica)
```

### 15.7 CI mínima (GitHub Actions)

`.github/workflows/ci.yml`:

```yaml
name: CI
on:
  pull_request:
  push:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo typecheck
      - run: pnpm turbo lint
      - run: pnpm turbo test
      - name: Drizzle migration check
        run: pnpm -F @academic-os/db check
```

### 15.8 CODEOWNERS

```
/apps/web/                   @oliver @armando
/packages/db/                @armando
/packages/auth/              @armando
/packages/ai/                @oliver
/packages/integrations/      @armando
/packages/ui/                @oliver
/docs/                       @oliver @armando
```

---

## 16 · IMPLEMENTATION ROADMAP

Todo en semanas. Suponiendo 2 personas a 15-25h/semana cada una (no es un full-time), con Claude Code como ejecutor primario.

### 16.1 Fase 0 — Bootstrap (semana 1)

**Objetivo**: repo vivo, CI verde, Supabase local corriendo, un "hello world" deploy en Vercel.

Entregables:
- Monorepo pnpm + Turborepo.
- Next.js 15 en `apps/web` con una página protegida por auth placeholder.
- Supabase local con schema vacío.
- CI pasando.
- Preview deploy funcional.
- Docs críticos de §14.1 redactados.

### 16.2 Fase 1 — Núcleo base (semanas 2-5)

**Objetivo**: Óliver y Armando pueden usarlo como CRUD puro.

Entregables:
- Auth Google + email (Supabase Auth).
- Onboarding con plantilla UAL 1º Ingeniería.
- Schema completo de identity + academic.
- Vista Asignaturas con tabs Resumen/Teoría/Práctica.
- Upload de PDFs + imágenes + notas texto.
- Calendario con CRUD manual + import iCal básico.
- Tareas con recordatorios email.
- Shell mobile + desktop.

### 16.3 Fase 2 — Inteligencia (semanas 6-9)

**Objetivo**: el producto aporta valor único vs Notion.

Entregables:
- Pipeline de ingestion de documentos completo.
- RAG híbrido con pgvector + BM25 + rerank.
- Subject chat con memoria conversacional + memoria por asignatura.
- Generador de tests v0.
- Citas en respuestas → abrir PDF en página correcta.
- Análisis automático de documentos subidos.

### 16.4 Fase 3 — Sync e integraciones (semanas 10-14)

**Objetivo**: reducción de entrada manual.

Entregables:
- Google Calendar OAuth + sync bidireccional opcional.
- iCal pull con cron + deduplicación + detección de cambios + notificaciones.
- Notificaciones push web.
- Admin panel mínimo (ver usuarios, ver documentos, ver jobs).

**Beta UAL abierta al final de fase 3**.

### 16.5 Fase 4 — Colaboración (semanas 15-20)

- Chrome extension UAL Bridge (scrape aulavirtual.ual.es).
- Canales por asignatura + general + menciones.
- Delegado: eventos oficiales, moderación básica.
- Resumen diario de canales (IA).

### 16.6 Fase 5 — Analítica + refinamiento (semanas 21-24)

- Transcripción de audio + "acta de clase".
- Planner adaptativo v1.
- Métricas de estudio visibles.
- Tutor mode (ejercicios paso a paso).
- Hardening: seguridad, perf, costes LLM, observabilidad.

### 16.7 Dependencias críticas

- Fase 1 bloquea todo. No empezar IA sin schema estable.
- Fase 2 bloquea tests generator y planner.
- Fase 3 puede ir en paralelo con fase 2 avanzada (Armando sync, Óliver IA).
- Fase 4 requiere fase 3 estable (notificaciones).
- Fase 5 requiere perfil de alumno con datos (mínimo 4 semanas de uso).

---

## 17 · TASK BREAKDOWN FOR CLAUDE CODE

Tareas atómicas, 1-4 horas cada una, con contexto suficiente para que Claude Code ejecute sin ambigüedad. Este listado es el **input directo para el entregable B** (issues de GitHub).

### 17.1 Principios

- Cada tarea tiene: objetivo, archivos a tocar, input esperado, output esperado, criterios de hecho.
- Ninguna tarea toca más de 1 módulo principal (para evitar PRs masivos).
- Tareas de Claude Code están marcadas con label `claude-code-ready` en GitHub.
- Claude Code **recibe siempre** el contexto del archivo de prompts (§E) + links a ARCHITECTURE.md + DB_SCHEMA.md.

### 17.2 Primeras 40 tareas (orden de ejecución)

Las 25 primeras están redactadas completas en el entregable B. Aquí el esqueleto ampliado:

```
# Fase 0 (Bootstrap)
T001 · Setup monorepo pnpm + Turborepo + tsconfig base
T002 · Next.js 15 app inicializada con Tailwind + shadcn
T003 · Supabase CLI local + primer migration vacía
T004 · CI GitHub Actions (typecheck + lint + test)
T005 · Deploy Vercel preview funcional
T006 · Docs iniciales (README, ARCHITECTURE, DB_SCHEMA stubs)

# Fase 1 (Core)
T007 · Schema identity + academic (Drizzle)
T008 · RLS policies identity + academic
T009 · Seed UAL + grados ingeniería + asignaturas 1º
T010 · Supabase Auth (Google OAuth + email magic link)
T011 · Middleware auth en Next.js App Router
T012 · Página login + callback
T013 · Onboarding flow (3 pasos)
T014 · Clonado plantilla subjects al cohort del usuario
T015 · Shell de app (top bar + rail + bottom nav)
T016 · Vista lista de Asignaturas
T017 · Vista detalle Asignatura con tabs
T018 · Schema materials + RLS
T019 · Upload de PDFs (server action + storage)
T020 · Viewer de PDFs embedded
T021 · Upload de imágenes y notas texto
T022 · Schema calendar/events + RLS
T023 · Vista Calendario (mes/agenda/día)
T024 · CRUD manual de eventos
T025 · Schema tasks + reminders
T026 · Vista Tareas Kanban/lista
T027 · Cron recordatorios email (Inngest + Resend)

# Fase 2 (IA)
T028 · Schema documents + chunks (pgvector)
T029 · Job ingestion: parse PDF → chunks
T030 · Job ingestion: embed chunks (OpenAI)
T031 · Endpoint búsqueda híbrida (vector + BM25 + RRF)
T032 · Rerank integration
T033 · Schema conversations + messages
T034 · Subject chat UI
T035 · Chat orchestrator (retrieval + prompt + citations)
T036 · Memoria de conversación (summary jsonb)
T037 · Perfil de estudio (study_method)
T038 · Analyze resource job (resumen auto)
T039 · Test generator (LLM + Zod)
T040 · Test attempt UI + corrección
```

Cada tarea se convierte en issue con formato definido en §B.

### 17.3 Cómo trabaja Claude Code con una tarea

1. Claude Code recibe la issue + contexto (ARCHITECTURE.md + archivos relevantes + PROMPTS.md).
2. Abre rama `feat/TNNN-short-title`.
3. Genera código + tests + migración (si aplica).
4. Corre local typecheck/lint/test.
5. Abre PR usando el template.
6. Óliver o Armando revisan (revisor asignado automáticamente por CODEOWNERS).
7. Merge auto al verde.

### 17.4 Qué NO delegamos a Claude Code

- Decisiones de arquitectura no triviales.
- Cambios en RLS policies sin revisión humana.
- Integración de nuevas dependencias sin ADR.
- Cambios en el esquema después de tener datos reales (migración + backfill manual).
- Prompts de LLM que afectan coste o calidad de respuesta sin eval.

---

## 18 · RISKS AND HARD TRUTHS

Esta sección es la que salva el proyecto en 6 meses. Léela entera antes de escribir la primera línea.

### 18.1 Riesgos técnicos reales

**R1 · Blackboard Ultra es una caja negra.** No hay API pública para estudiantes. La extensión Chrome de la fase 4 **va a romperse** cuando UAL actualice Blackboard. Mitigación: tests de contrato + plan B claro (iCal + manual). No vendas "sync perfecto con aula virtual", véndelo como "asistente que lee lo que tú ya ves".

**R2 · pgvector escala bien hasta cierto punto.** Con millones de chunks y recall alto, el índice HNSW en Postgres compite con soluciones dedicadas. Para V1/V2 sobra. Para >1M chunks evaluar Pinecone o Qdrant self-hosted. No optimizar prematuramente.

**R3 · El coste de LLM puede descontrolar si hay abuso o bucles.** Usuarios que abren 50 pestañas de chat. Conversaciones que acumulan contexto sin summary. Jobs de re-embedding innecesarios. Mitigación: límites por usuario, circuit breakers, alertas desde día 1.

**R4 · La calidad del RAG depende brutalmente del chunking.** PDFs escaneados mal OCR-izados = basura. PDFs de ingeniería con fórmulas matemáticas son especialmente difíciles (las fórmulas se pierden al chunkar texto). Mitigación explícita: detectar documentos con baja extracción textual y pedir al alumno versión mejor, o aplicar OCR Mistral antes.

**R5 · Supabase como SPOF.** Si se cae Supabase, se cae todo: DB, Auth, Storage, RLS. Mitigación: backups diarios propios via pg_dump cron + test de restore trimestral.

**R6 · Vercel timeouts.** Serverless functions de Vercel tienen 10s (hobby) / 60s (pro) de límite. Cualquier cosa que pase de 5s: Inngest.

**R7 · Realtime de Supabase no es mágico.** Tiene cuota de conexiones y throughput. Para los canales V2, con 100 alumnos conectados a la vez ya se notará. Evaluar Liveblocks o similar si crece.

### 18.2 Riesgos de producto

**P1 · Onboarding frágil.** Si un alumno nuevo no sube su primer documento en los primeros 5 minutos, lo perdimos. El producto sin material subido es inútil. Onboarding tiene que **empujar** a subir algo.

**P2 · "Otro WhatsApp más" es el fracaso del sistema de canales.** Si dejamos notificaciones por defecto, se convierte en ruido y la gente silencia todo. Por eso §8.3 es tan estricto.

**P3 · La IA promete demasiado.** Si un alumno le pide a Claude "explícame derivadas" y Claude se inventa algo que no está en los apuntes, pierde confianza para siempre. El sistema **debe citar siempre** y el prompt de chat tiene que obligar a "si no está en el material, dilo explícitamente".

**P4 · Móvil subestimado.** Los estudiantes van a usar esto en el bus, entre clases, al acostarse. Si funciona "regular" en iPhone, está muerto. Cada feature tiene que tener su diseño móvil pensado antes de codearse.

**P5 · Fragmentación por cohort.** Si hay 4 cohorts distintos del mismo grado y los alumnos saltan entre grupos, empiezan a ver cosas duplicadas o inconsistentes. Necesitamos flujo para "cambiar de grupo" limpio.

### 18.3 Cosas que NO hay que sobre-diseñar

- **No multi-DB.** RLS basta.
- **No GraphQL.** Server Actions + endpoints REST puntuales.
- **No microservicios.** Monolito Next.js + Inngest es la arquitectura.
- **No sistema propio de queues.** Inngest.
- **No custom auth.** Supabase Auth.
- **No custom vector DB.** pgvector.
- **No workspace > user.** No inventes tenancy innecesario.
- **No i18n en V1.** Español, punto. Inglés V3.
- **No sistema de plugins o extensibilidad.** No hay 3rd parties todavía.

### 18.4 Decisiones que **sonarían bien pero son malas**

- **"Hagamos app nativa con Expo desde V1"**: mata la velocidad. PWA.
- **"Usemos un LLM open source self-hosted"**: coste de mantenimiento > coste API por al menos 12 meses.
- **"Scrapeemos Blackboard desde servidor"**: bloqueo de IP inmediato y problema legal. La extensión es el único camino sano.
- **"Hagamos un foro público para todos los alumnos UAL"**: el valor está en cohorts pequeños. Foros gigantes → ruido.
- **"Vendámoslo a profesores"**: otro producto, otra venta, otro ICP. Más tarde.
- **"Cobremos desde V1"**: no todavía. Primero valor demostrable.
- **"Metamos gamificación para enganchar"**: enganchar sin valor = churn brutal. Primero valor, luego XP.

### 18.5 Criterios de "plug pulling"

Cuándo aceptar que algo no está funcionando:

- Si en semana 10 ninguno de los dos fundadores usa el producto **todos los días**, hay un problema fundamental de diseño. Stop y rediseña.
- Si el coste LLM por usuario activo pasa de 3€/mes sostenido y no baja tras optimizar, el modelo de producto no es viable en free.
- Si el RAG tiene menos de 70% recall@8 en el eval set tras 3 iteraciones, cambiar pipeline.

---

## 19 · FINAL RECOMMENDATION

### 19.1 Orden exacto para empezar ya

**Día 1 — Óliver**:
- Crea repo vacío `academic-os` privado en GitHub.
- Invita a Armando como admin.
- Sube este documento a `docs/MASTER_BLUEPRINT.md`.

**Día 1 — Armando**:
- Abre cuenta Supabase (tier free), crea proyecto `academic-os-dev`.
- Abre cuenta Vercel, conecta al repo.
- Registra dominios (`academicos.dev` o similar — decidir entre los dos).

**Días 2-3 — Armando**:
- T001: Monorepo + Turborepo + pnpm workspaces.
- T002: Next.js 15 app con Tailwind + shadcn base.
- T003: Supabase local corriendo.
- T004: CI GitHub Actions.

**Días 2-3 — Óliver**:
- Redacta `docs/PRODUCT.md`, `docs/CONTRIBUTING.md`, `docs/setup/MAC_SETUP.md` a partir de las secciones de este documento.
- Crea las 25 issues iniciales (entregable B) en GitHub con el template.
- Configura project board, milestones, labels.

**Día 4 — Síncrono (voz, 1h)**:
- Repasar juntos que el repo está vivo, deploy verde, issues claras.
- Asignar las primeras 5 issues a cada uno.
- Acordar ritmo semanal y canal de comunicación.

**Días 5-7**:
- Ambos empiezan a tirar de issues de la fase 1.
- Primer PR pequeño cada uno para probar el flujo (ej. Armando: página `/health`; Óliver: componente `<Logo />`).

### 19.2 Qué hace primero cada uno (lo que genera más valor de forma paralela)

**Óliver arranca por**:
1. Shell de la app (layout, navegación, theme).
2. Onboarding flow.
3. Vistas básicas de asignatura (Resumen, Teoría, Práctica, con mocks antes de DB).

Razón: todo esto es UX-heavy y Óliver es el owner de UI/UX. Además, empezar por UI con datos mock le deja a Armando margen para cerrar backend.

**Armando arranca por**:
1. Schema DB completo (identity + academic + materials).
2. RLS policies y seed UAL.
3. Auth funcional con Google.
4. Upload a Supabase Storage con server action.

Razón: todo esto es infra crítica; sin esto Óliver no puede conectar nada real. Armando es el owner de backend.

**Convergen al final de semana 2**:
- Los mocks de Óliver se conectan a las queries reales de Armando.
- Primer PR conjunto: "Subjects tab wired to DB".

### 19.3 La mejor estrategia

**Semanas 1-2**: montar la fontanería. CI, deploy, auth, schema. Aburrido pero esencial.

**Semanas 3-5**: CRUD puro. Asignaturas, materiales, calendario. Hacerlo bien en móvil desde ya.

**Semana 6**: primer momento "wow". RAG + chat funcionando sobre 1 asignatura real. Este es el momento en que uno de los dos dice "joder, esto funciona".

**Semanas 7-9**: pulir IA, tests generator, análisis automático. Es el core del diferencial vs Notion.

**Semana 10**: primer uso intensivo por parte de ambos fundadores con **las asignaturas reales de Óliver en UAL** (Matemáticas II, Física II, Estadística, Programación, Tecnología Fabricación). Encontrarán 50 bugs. Arreglarlos todos antes de abrir.

**Semana 11-12**: invitar a 5-10 compañeros de clase. Iterar sobre feedback.

**Semanas 13+**: abrir más y empezar fase 3 (sync) en paralelo.

### 19.4 Un consejo final que vale más que el resto del documento

El 80% del éxito de este proyecto depende de **usarlo todos los días desde la semana 2**, incluso cuando está roto, con dolor, con rabia. Si Óliver no mete sus apuntes de Matemáticas II el lunes en cuanto hay upload funcionando, el producto se va a construir desconectado de la realidad.

**Dogfooding agresivo desde día 10 es innegociable**.

---

## A · REPARTO DE TRABAJO ÓLIVER ↔ ARMANDO (SEMANAS 1-2)

Asignación concreta, hora por hora cuando aplica. Todo lo que no esté aquí es fase 2 y se replanifica en la reunión del viernes de semana 2.

### A.1 Semana 1 — Bootstrap + fundaciones

| Área                        | Owner    | Tareas concretas                                                                                           |
| --------------------------- | -------- | ----------------------------------------------------------------------------------------------------------- |
| Creación repo y permisos    | Óliver   | Crear `academic-os`, CODEOWNERS, labels, milestones, issue/PR templates, project board                     |
| Docs iniciales              | Óliver   | README, CONTRIBUTING, MAC_SETUP, PRODUCT, PROMPTS stubs                                                     |
| Bootstrap monorepo          | Armando  | pnpm + Turborepo + tsconfig base + eslint + prettier + vitest                                              |
| Next.js app inicial         | Armando  | apps/web con Tailwind + shadcn base + layout vacío                                                         |
| Supabase proyecto           | Armando  | Cuenta, proyecto dev, Supabase CLI local corriendo                                                          |
| CI                          | Armando  | workflow `ci.yml` con typecheck/lint/test                                                                   |
| Deploy Vercel               | Armando  | Conectar repo, configurar env vars base                                                                     |
| Issue 001-025 redactadas    | Óliver   | Entregable B completo subido como issues en GitHub                                                          |
| Design tokens iniciales     | Óliver   | Colors (OKLCH), tipografía, spacing, radii, theme light/dark                                                |
| Componentes UI base         | Óliver   | Button, Input, Card, Tabs, Dialog, Toast (shadcn customizado con tokens)                                   |

**Reparto aproximado**: Armando 60% infra / 40% código; Óliver 50% docs+issues / 50% UI base.

### A.2 Semana 2 — Auth + Schema + Shell

| Área                        | Owner    | Tareas concretas                                                                                           |
| --------------------------- | -------- | ----------------------------------------------------------------------------------------------------------- |
| Schema identity             | Armando  | users, universities, degree_programs, cohorts, memberships (Drizzle + migrations)                          |
| Schema academic             | Armando  | subjects, subject_members, topics (Drizzle + migrations)                                                    |
| RLS policies identity + academic | Armando | Políticas Postgres + tests en SQL                                                                       |
| Seed UAL                    | Armando  | universities=UAL, grados ingeniería, subjects 1Q/2Q reales                                                  |
| Supabase Auth Google        | Armando  | OAuth Google configurado, callback handler, middleware                                                      |
| Magic link email            | Armando  | Fallback sin Google                                                                                         |
| Shell app (layout)          | Óliver   | Top bar, left rail desktop, bottom nav mobile, responsive                                                   |
| Login screen                | Óliver   | Pantalla login + branding                                                                                   |
| Onboarding steps UI         | Óliver   | 3 pantallas (universidad/grado/asignaturas)                                                                 |
| Dashboard placeholder       | Óliver   | Vista vacía con secciones mock                                                                              |
| Vista Asignaturas (lista)   | Óliver   | Card por asignatura con color, nombre, código, siguiente evento mock                                        |
| Vista Asignatura (tabs)     | Óliver   | Shell con tabs Resumen/Teoría/Práctica/Chat/Calendario/Tests (contenido mock)                               |
| Revisiones cruzadas         | Ambos    | Cada uno revisa PRs del otro en <24h                                                                        |

**Entrega fin de semana 2**: un alumno puede hacer login, onboardear, ver sus 5 asignaturas en lista, entrar a cada una y ver los tabs (mock). Sin material real todavía.

### A.3 Revisión de PRs

- Regla fija: ningún PR del otro espera más de 24h para primer feedback.
- Si el revisor está bloqueado: comentar en el PR + mover a `blocked` en project board.
- Pair review síncrono los viernes (30 min compartiendo pantalla).

### A.4 Quién toca qué en la semana 3 (preview)

- **Armando**: Schema materials + storage + upload server action + Inngest setup.
- **Óliver**: Viewer de PDF, upload UI drag-drop, tarjetas de recurso, vista teoría con recursos reales.

---

## B · LAS 25 PRIMERAS ISSUES DE GITHUB (REDACTADAS)

Copiar/pegar directo a GitHub. Formato compatible con el template de §15.5.

---

### Issue #1 · `[T001] Setup monorepo con pnpm workspaces y Turborepo`

**Labels**: `type:chore`, `scope:infra`, `P0`, `claude-code-ready`
**Milestone**: V1 — Alpha interno

**Objetivo**
Crear la estructura base del monorepo con pnpm workspaces, Turborepo, configuraciones compartidas de TypeScript, ESLint y Prettier.

**Contexto**
Base del proyecto. Todas las demás tareas dependen de esta. Referencia: `docs/ARCHITECTURE.md §13` (estructura de repo).

**Tareas**
- [ ] `package.json` raíz con engines (`node >= 20`, `pnpm >= 9`).
- [ ] `pnpm-workspace.yaml` con `apps/*` y `packages/*`.
- [ ] `turbo.json` con pipelines `build`, `dev`, `lint`, `typecheck`, `test`.
- [ ] `packages/config-ts/` con `base.json`, `next.json`, `react-lib.json`.
- [ ] `packages/config-eslint/` con config flat compartida + `typescript-eslint`.
- [ ] `packages/config-tailwind/` con preset compartido.
- [ ] `.nvmrc` con Node 20.
- [ ] `.gitignore` robusto (incluye `.env`, `.next`, `node_modules`, `.turbo`, `.vercel`).
- [ ] `.editorconfig`.
- [ ] `README.md` raíz con instrucciones de setup en Mac.

**Criterios de aceptación**
- `pnpm install` funciona limpio.
- `pnpm turbo build` no falla (aunque no haya nada que buildear todavía).
- `pnpm turbo typecheck` y `lint` pasan.
- Docs `MAC_SETUP.md` permiten a alguien nuevo dejar el repo corriendo en < 10 min.

**Dependencias**: ninguna. Es la primera.

---

### Issue #2 · `[T002] Next.js 15 con Tailwind + shadcn/ui en apps/web`

**Labels**: `type:chore`, `scope:ui`, `P0`, `claude-code-ready`
**Milestone**: V1 — Alpha interno

**Objetivo**
Inicializar `apps/web` como Next.js 15 App Router con Tailwind configurado y shadcn/ui listo para añadir componentes.

**Contexto**
App principal del producto. Necesita estar bien configurada desde el inicio: strict TypeScript, rutas tipadas, App Router only.

**Tareas**
- [ ] `apps/web` con Next.js 15 + TS strict (App Router, no Pages Router).
- [ ] Tailwind v4 configurado con preset de `@academic-os/config-tailwind`.
- [ ] shadcn/ui inicializado con theme base (neutral + azul primario).
- [ ] Instalar componentes base: Button, Input, Label, Card, Dialog, Tabs, Toast, DropdownMenu.
- [ ] `layout.tsx` raíz con font (Geist Sans), `ThemeProvider` dark/light, `Toaster`.
- [ ] Página `/` con placeholder "Academic OS · Soon".
- [ ] `next.config.mjs` con `typedRoutes: true`, `serverActions` habilitado, imágenes de Supabase permitidas.
- [ ] `tsconfig.json` extendiendo `@academic-os/config-ts/next.json` con paths alias.

**Criterios de aceptación**
- `pnpm dev` arranca en `http://localhost:3000` sin errores ni warnings.
- Cambio de theme light/dark funciona.
- Toast se muestra con un botón de prueba.
- `next build` produce build válido.

**Dependencias**: #1

---

### Issue #3 · `[T003] Supabase local con Docker y proyecto dev en Supabase Cloud`

**Labels**: `type:chore`, `scope:db`, `scope:infra`, `P0`

**Objetivo**
Tener Supabase corriendo tanto local (dev) como en cloud (preview/prod). Scripts para reset y seed.

**Tareas**
- [ ] Instalar Supabase CLI en el repo (`supabase` package dev dep).
- [ ] `supabase init` → `supabase/` con config.
- [ ] Crear proyecto `academic-os-dev` en Supabase Cloud.
- [ ] `.env.example` con variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
- [ ] `scripts/dev.sh` que arranca Supabase local + Next dev en paralelo.
- [ ] `scripts/reset-db.sh` que resetea local DB.
- [ ] Extensions habilitadas en migration inicial: `pgcrypto`, `uuid-ossp`, `vector`, `pg_cron`, `pg_net`.
- [ ] Doc `docs/setup/SUPABASE_LOCAL.md`.

**Criterios de aceptación**
- `pnpm supabase start` levanta local DB.
- Conexión desde Next.js local a Supabase local verificable vía query simple.
- Reset funciona y re-aplica extensions.

**Dependencias**: #1

---

### Issue #4 · `[T004] GitHub Actions CI (typecheck + lint + test)`

**Labels**: `type:chore`, `scope:infra`, `P0`, `claude-code-ready`

**Objetivo**
CI verde obligatorio en todos los PRs.

**Tareas**
- [ ] Workflow `.github/workflows/ci.yml` con matriz: Node 20, pnpm 9.
- [ ] Steps: install (frozen-lockfile), `turbo typecheck`, `turbo lint`, `turbo test`.
- [ ] Cache de `node_modules` y `.turbo` entre runs.
- [ ] Workflow corre en `pull_request` y `push` a main.
- [ ] Branch protection en GitHub: requiere `CI / quality` verde antes de merge.
- [ ] README raíz con badge de CI.

**Criterios de aceptación**
- PR con código malo → CI rojo, no mergeable.
- PR limpio → CI verde en < 4 min.

**Dependencias**: #1, #2

---

### Issue #5 · `[T005] Deploy preview Vercel funcional`

**Labels**: `type:chore`, `scope:infra`, `P0`

**Objetivo**
Cada PR genera preview deploy automático. `main` despliega a prod.

**Tareas**
- [ ] Conectar repo a Vercel.
- [ ] Configurar root directory en `apps/web`.
- [ ] Variables de entorno en Vercel (URL Supabase prod, anon key).
- [ ] Deploy hook para preview en PR.
- [ ] Dominio `dev.academicos.xxx` apuntando a preview rama develop (si decidimos tener develop) o a main.
- [ ] Password protection en preview de producción hasta V1 beta.

**Criterios de aceptación**
- PR abierto → comentario de Vercel bot con URL de preview.
- Click en preview → app cargada.

**Dependencias**: #2

---

### Issue #6 · `[T006] Docs base: README, PRODUCT, ARCHITECTURE, CONTRIBUTING`

**Labels**: `type:docs`, `P0`

**Objetivo**
Dejar la documentación crítica redactada en semana 1.

**Tareas**
- [ ] `README.md` raíz: qué es + cómo correr en Mac + links a docs clave.
- [ ] `docs/PRODUCT.md`: visión + V1/V2 + personas + no-objetivos.
- [ ] `docs/ARCHITECTURE.md`: stack + diagramas + decisiones.
- [ ] `docs/CONTRIBUTING.md`: branches, commits, PRs, DoD.
- [ ] `docs/setup/MAC_SETUP.md`: brew, node, pnpm, supabase cli, docker, VS Code extensions recomendadas.
- [ ] `docs/setup/ENV_VARS.md`: todas las env vars con dónde sacarlas.

**Criterios de aceptación**
- Alguien sin contexto puede leer `README.md` → `MAC_SETUP.md` → tener el repo corriendo en 10 min.

**Dependencias**: #1

---

### Issue #7 · `[T007] Drizzle schema: identity + academic`

**Labels**: `type:feat`, `scope:db`, `P0`, `claude-code-ready`

**Objetivo**
Schema inicial de identidad (universidades, grados, cohorts, users, memberships) y núcleo académico (subjects, subject_members, topics).

**Contexto**
Referencia: `docs/ARCHITECTURE.md §6.2` (Identity + Academic Graph).

**Tareas**
- [ ] `packages/db` con Drizzle + drizzle-kit.
- [ ] `src/schema/identity.ts` con tablas: `universities`, `degree_programs`, `cohorts`, `users`, `memberships`.
- [ ] `src/schema/academic.ts` con `subjects`, `subject_members`, `topics`.
- [ ] Enums tipados (`role`, `membership_status`, `topic_kind`, `subject_kind`).
- [ ] Relaciones definidas con `relations()` de Drizzle.
- [ ] Migración inicial generada (`drizzle-kit generate`).
- [ ] Trigger `set_updated_at` aplicado a todas las tablas.
- [ ] Índices: ver §6.3.

**Criterios de aceptación**
- `pnpm db:generate` produce migration SQL legible.
- `pnpm db:push` aplica en local sin errores.
- Tests de inserción básica pasan en CI.

**Dependencias**: #3

---

### Issue #8 · `[T008] RLS policies para identity + academic`

**Labels**: `type:feat`, `scope:db`, `security`, `P0`

**Objetivo**
Políticas de Row-Level Security que hacen que cada usuario solo vea lo suyo + lo de su cohort.

**Tareas**
- [ ] SQL en `packages/db/src/policies/identity.sql` y `academic.sql`.
- [ ] `alter table ... enable row level security` en todas.
- [ ] Policy `users_select_own` (`auth.uid() = id`).
- [ ] Policy `memberships_select_own`.
- [ ] Policy `subjects_select_cohort_member`.
- [ ] Policy `subject_members_select_same_subject`.
- [ ] Función helper `is_cohort_member(cohort_id)` en SQL.
- [ ] Tests con dos usuarios creados en Supabase test → uno NO ve subjects del otro cohort.

**Criterios de aceptación**
- Tests integración Supabase verifican aislamiento entre cohorts.
- Admin bypass vía service role funciona solo en server.

**Dependencias**: #7

---

### Issue #9 · `[T009] Seed UAL: universidad + grados + asignaturas 1º`

**Labels**: `type:feat`, `scope:db`, `P1`, `claude-code-ready`

**Objetivo**
Datos maestros de UAL 1º Ingeniería para usarse en onboarding.

**Tareas**
- [ ] `packages/db/src/seed/ual.ts` que inserta:
  - `universities`: UAL (slug: `ual`, locale: `es-ES`).
  - `degree_programs`: Ing. Mecánica, Ing. Electrónica Industrial (el otro grado con estas mismas asignaturas aparentes).
  - `cohorts`: 2025/26 · 1Q y 2Q por cada grado.
  - `subjects` con códigos reales (44101101, 44101102, 44101103, 44101105, 44101106, 44101107, 44101108, 44101109, 44101110, 44103226), colores y semestre correcto.
  - `topics` genéricos por asignatura (ej. Mates I: 5 temas clásicos).
- [ ] Script `pnpm db:seed:ual`.

**Criterios de aceptación**
- Seed idempotente (correr 2 veces no rompe).
- En DB local se ven las 10 asignaturas distribuidas en 1Q/2Q.

**Dependencias**: #7

---

### Issue #10 · `[T010] Supabase Auth: Google OAuth + magic link email`

**Labels**: `type:feat`, `scope:auth`, `P0`

**Objetivo**
Login funcional con Google como método principal y magic link como fallback.

**Tareas**
- [ ] Configurar Google OAuth en Supabase dashboard.
- [ ] Ruta `/login` con componente `<LoginCard>` (Google + email).
- [ ] Route handler `/api/auth/callback` que maneja el retorno OAuth.
- [ ] Hook de `onAuthStateChange` para sync de sesión.
- [ ] Trigger SQL `on_auth_user_created` que crea fila en `users` + `memberships` pendiente.
- [ ] Protección de rutas `(app)` con middleware.
- [ ] Logout funcional.

**Criterios de aceptación**
- Login Google funciona en dev.
- Magic link llega al email en < 1 min.
- Sesión persiste al refrescar.
- Rutas `(app)/*` redirigen a `/login` si no autenticado.

**Dependencias**: #3, #7

---

### Issue #11 · `[T011] Middleware Next.js: auth + tenant context`

**Labels**: `type:feat`, `scope:auth`, `P0`

**Objetivo**
Middleware que enriquece cada request con user + membership actual.

**Tareas**
- [ ] `middleware.ts` con matcher que excluye `/login`, `/api/public`, assets.
- [ ] Helper `getSessionUser(req)` que devuelve `{ user, activeMembership }`.
- [ ] Redirects si no onboardeado (no tiene `activeMembership`).
- [ ] Cookie `active_cohort_id` para usuarios multi-cohort futuros.

**Criterios de aceptación**
- Request a `/dashboard` sin login → 302 a `/login?next=/dashboard`.
- Request autenticado pero sin membership → 302 a `/onboarding`.
- `getSessionUser` cacheado en scope de request (RSC).

**Dependencias**: #10

---

### Issue #12 · `[T012] Onboarding flow (3 pasos)`

**Labels**: `type:feat`, `scope:ui`, `scope:auth`, `P0`

**Objetivo**
Flujo de 3 pantallas que al final deja al usuario con `membership.status = active` y asignaturas clonadas.

**Tareas**
- [ ] `/onboarding/step-1` — selección de universidad (UAL por defecto).
- [ ] `/onboarding/step-2` — selección de grado + año.
- [ ] `/onboarding/step-3` — confirmación de asignaturas del cuatrimestre actual (checkboxes desde plantilla).
- [ ] Server action `completeOnboarding` que crea `membership`, clona subjects activos al cohort.
- [ ] Progress bar 1/3, 2/3, 3/3.
- [ ] Funciona en móvil.

**Criterios de aceptación**
- Onboarding se completa en < 90 segundos en móvil.
- Al acabar, usuario llega a `/dashboard` con sus asignaturas visibles.
- Si el usuario cierra el navegador a mitad, al volver retoma donde estaba.

**Dependencias**: #11, #9

---

### Issue #13 · `[T013] Shell de app: top bar + left rail + bottom nav mobile`

**Labels**: `type:feat`, `scope:ui`, `P0`

**Objetivo**
Layout responsivo del área autenticada con navegación consistente.

**Tareas**
- [ ] `(app)/layout.tsx` con TopBar + Rail desktop + BottomNav móvil.
- [ ] Top bar: logo, search placeholder, notificaciones icon, avatar menu.
- [ ] Rail desktop ≥ 1024px: Home, Asignaturas, Calendario, Tareas.
- [ ] Bottom nav móvil: 4 ítems + botón flotante "+" para crear.
- [ ] Estados active/hover accesibles (focus ring visible).
- [ ] Tested en viewports: 390×844 (iPhone 15), 768×1024 (iPad), 1280×800 (laptop).

**Criterios de aceptación**
- Zero horizontal scroll en ningún viewport.
- Transiciones de ruta < 100ms entre items del nav.
- Accesibilidad: navegable con teclado, aria-labels correctos.

**Dependencias**: #2, #11

---

### Issue #14 · `[T014] Vista lista de Asignaturas`

**Labels**: `type:feat`, `scope:ui`, `P0`

**Objetivo**
`/subjects` muestra las asignaturas del cuatrimestre actual del usuario como cards.

**Tareas**
- [ ] Server component que lee `subjects` del cohort activo del usuario.
- [ ] Card por asignatura: color, nombre, código, créditos, próximo evento si hay.
- [ ] Filtro cuatrimestre 1Q / 2Q / Todos.
- [ ] Empty state si no hay asignaturas.
- [ ] Loading skeleton.
- [ ] Click → `/subjects/[subjectId]`.

**Criterios de aceptación**
- 5-10 asignaturas visibles del seed UAL.
- Responsive grid 1col móvil / 2col tablet / 3col desktop.

**Dependencias**: #9, #13

---

### Issue #15 · `[T015] Vista detalle Asignatura con tabs`

**Labels**: `type:feat`, `scope:ui`, `P0`

**Objetivo**
`/subjects/[subjectId]` con tabs Resumen / Teoría / Práctica / Chat / Calendario / Tests.

**Tareas**
- [ ] Layout con header (color banner + nombre asignatura + código).
- [ ] Tabs persistentes en URL: `/subjects/[id]/(theory|practice|chat|tests|calendar)`.
- [ ] Tab Resumen como default.
- [ ] Contenido placeholder por tab (mock cards).
- [ ] Breadcrumbs.

**Criterios de aceptación**
- URL refleja la tab activa.
- Al navegar entre asignaturas, la tab activa se mantiene.
- Móvil: tabs con scroll horizontal si no caben.

**Dependencias**: #14

---

### Issue #16 · `[T016] Schema materials: resources + documents (stub) + storage bucket`

**Labels**: `type:feat`, `scope:db`, `P0`

**Objetivo**
Tablas de materials y bucket de storage con RLS.

**Tareas**
- [ ] Schema `resources` (ver §6.2).
- [ ] Schema `documents` (stub inicial).
- [ ] Supabase bucket `resources` privado con RLS (user_id matches).
- [ ] Policies SQL.
- [ ] Tests: usuario A no puede leer fichero de usuario B.

**Criterios de aceptación**
- Migración aplicada.
- Upload/download vía server action funciona.
- Intento de acceso a fichero ajeno → 403.

**Dependencias**: #7, #8

---

### Issue #17 · `[T017] Upload de PDFs a una asignatura (server action + viewer)`

**Labels**: `type:feat`, `scope:ui`, `P0`

**Objetivo**
Subir PDF → aparece en vista Teoría o Práctica → abrir en viewer embed.

**Tareas**
- [ ] Server action `uploadResource(subjectId, topicKind, file)` que sube a Storage y crea `resource`.
- [ ] Componente `<ResourceDropzone>` con drag&drop web + botón móvil.
- [ ] Lista de recursos en tab Teoría con card (nombre, tipo, tamaño, fecha).
- [ ] Ruta `/subjects/[id]/resources/[resourceId]` con PDF viewer (`react-pdf` o iframe con URL firmada).
- [ ] Borrado soft con confirmación.

**Criterios de aceptación**
- Subir PDF de 5MB tarda < 5s en dev.
- Viewer renderiza PDF correctamente.
- Pre-firmado de URL expira en 1h.

**Dependencias**: #15, #16

---

### Issue #18 · `[T018] Upload de imágenes y notas de texto`

**Labels**: `type:feat`, `scope:ui`, `P1`

**Objetivo**
Extender #17 a imágenes (JPG/PNG/HEIC) y notas de texto rápidas.

**Tareas**
- [ ] Conversión HEIC → JPEG server-side si procede.
- [ ] Editor markdown simple para notas (Tiptap o textarea + preview).
- [ ] Thumbnail de imagen en cards.
- [ ] Galería de imágenes por topic.

**Criterios de aceptación**
- Foto desde iPhone → se ve bien.
- Nota markdown guardada y editable.

**Dependencias**: #17

---

### Issue #19 · `[T019] Schema calendar: events + reminders`

**Labels**: `type:feat`, `scope:db`, `P0`

**Objetivo**
Tablas de eventos, recordatorios y RLS.

**Tareas**
- [ ] Schema `events`, `reminders`, `integrations` (stub iCal/Google).
- [ ] RLS: usuario ve los suyos + los de cohort (scope shared).
- [ ] Índices por (owner_user_id, start_at) y (cohort_id, start_at).

**Dependencias**: #7

---

### Issue #20 · `[T020] Vista Calendario (mes + agenda)`

**Labels**: `type:feat`, `scope:ui`, `P0`

**Objetivo**
Calendario funcional con vistas mes (desktop) y agenda (móvil default), CRUD manual de eventos.

**Tareas**
- [ ] Componente calendario con `react-big-calendar` o custom (evaluar).
- [ ] Vista mes desktop, agenda móvil, día opcional.
- [ ] Colores por asignatura.
- [ ] Modal crear evento: título, inicio/fin, asignatura, lugar, kind, descripción.
- [ ] Drag & drop desktop para mover eventos.

**Criterios de aceptación**
- Crear/editar/borrar eventos funciona.
- Filtro por asignatura funciona.
- Móvil: agenda scroll infinito.

**Dependencias**: #19, #15

---

### Issue #21 · `[T021] Import iCal passive (pegar URL → pull cada 30min)`

**Labels**: `type:feat`, `scope:sync`, `P1`

**Objetivo**
El alumno pega su URL iCal del aula virtual y los eventos aparecen en el calendario.

**Tareas**
- [ ] Settings page con campo "URL iCal" + guía visual de cómo obtenerla en Blackboard Ultra.
- [ ] Guardar en `integrations` con provider `ical_url`.
- [ ] Inngest cron cada 30 min que pulla los iCal activos, parsea con `ical.js`, dedupe por `external_id`, inserta/actualiza en `events`.
- [ ] Manejo de timezones correcto (Europe/Madrid).

**Criterios de aceptación**
- Pegar URL válida → 1 min después aparecen eventos.
- Cambios en el iCal reflejados en próximo pull.
- Duplicados no aparecen.

**Dependencias**: #19, #20

---

### Issue #22 · `[T022] Schema tasks + reminders con recordatorio email`

**Labels**: `type:feat`, `scope:db`, `scope:ai`, `P0`

**Objetivo**
Tareas con recordatorio email automático el día antes.

**Tareas**
- [ ] Schema `tasks`.
- [ ] Server actions CRUD.
- [ ] Inngest cron horario que busca tareas con `due_at` en 24h ± 1h y status != done, sin `reminder.sent_at` → envía email vía Resend.
- [ ] Template email con deep link a la task.

**Criterios de aceptación**
- Task creada con due en 25h → email llega en la próxima hora.
- No re-envío (idempotencia).

**Dependencias**: #19

---

### Issue #23 · `[T023] Vista Tareas (Kanban desktop, lista móvil)`

**Labels**: `type:feat`, `scope:ui`, `P0`

**Tareas**
- [ ] Kanban con columnas todo/doing/done, drag&drop desktop.
- [ ] Lista móvil con swipe para cambiar estado.
- [ ] Agrupar por asignatura o por fecha.
- [ ] Quick add con input rápido.

**Dependencias**: #22

---

### Issue #24 · `[T024] Inngest setup + health route /api/health`

**Labels**: `type:chore`, `scope:infra`, `P0`

**Objetivo**
Infra de jobs lista + endpoint de health para monitoring.

**Tareas**
- [ ] Paquete `apps/jobs` (o integración en `apps/web/app/api/inngest`).
- [ ] Inngest client configurado con signing key y event key.
- [ ] Primer job de prueba `hello.world`.
- [ ] `/api/health` devuelve estado DB (query trivial), LLM (ping), embeddings (ping), inngest (check).

**Dependencias**: #3

---

### Issue #25 · `[T025] Analytics (PostHog) + error tracking (Sentry)`

**Labels**: `type:chore`, `scope:infra`, `P1`

**Objetivo**
Observabilidad mínima desde el inicio.

**Tareas**
- [ ] PostHog JS integrado en web con `pageview` auto + eventos clave (`user_signed_up`, `onboarding_completed`, `subject_opened`, `resource_uploaded`).
- [ ] Sentry integrado en web + jobs con source maps.
- [ ] Doc `docs/RUNBOOK.md` con nombres de eventos y dashboards recomendados.

**Dependencias**: #2, #24

---

## C · ESTRUCTURA DE MONOREPO (resumen ejecutivo)

Ya detallada en §13. Resumen: **un monorepo, dos apps iniciales (`web`, `jobs`), ocho packages**. Estructura probada (similar a la que usan Vercel, Dub, Cal.com internamente). Justificaciones:

- `apps/web` — la app. Todo lo específico del shell de producto.
- `apps/jobs` — runtime Inngest independiente (mismo repo, distinto deploy target).
- `packages/db` — Drizzle schema compartido; lo usan `web` y `jobs`.
- `packages/ai` — toda la lógica de prompts, retrieval, ingestion. Aislada para tests y evals.
- `packages/ui` — design system. Crece con shadcn components.
- `packages/integrations` — iCal, Google Calendar, Blackboard bridge. Aislada porque son adaptadores externos frágiles.
- `packages/email` — templates React Email + Resend.
- `packages/notifications` — push web + in-app dispatcher.
- `packages/auth` — helpers de Supabase Auth + permisos.
- `packages/shared` — tipos puros, enums, utils sin dependencias.

---

## D · ORDEN EXACTO PARA EJECUTAR CON CLAUDE CODE

Lista numerada, cada punto = una sesión de Claude Code con una issue concreta.

```
 1. Bootstrap repo                     → Issue #1 (T001)
 2. Next.js + Tailwind + shadcn        → Issue #2 (T002)
 3. Supabase local + cloud             → Issue #3 (T003)
 4. CI                                 → Issue #4 (T004)
 5. Deploy Vercel                      → Issue #5 (T005)
 6. Docs base                          → Issue #6 (T006)
 7. Schema identity + academic         → Issue #7 (T007)
 8. RLS policies                       → Issue #8 (T008)
 9. Seed UAL                           → Issue #9 (T009)
10. Auth Google + magic link           → Issue #10 (T010)
11. Middleware auth                    → Issue #11 (T011)
12. Onboarding flow                    → Issue #12 (T012)
13. Shell app (nav)                    → Issue #13 (T013)
14. Lista de asignaturas               → Issue #14 (T014)
15. Detalle asignatura + tabs          → Issue #15 (T015)
16. Schema materials + storage         → Issue #16 (T016)
17. Upload PDFs + viewer               → Issue #17 (T017)
18. Upload imágenes + notas            → Issue #18 (T018)
19. Schema calendar                    → Issue #19 (T019)
20. Vista Calendario                   → Issue #20 (T020)
21. Import iCal                        → Issue #21 (T021)
22. Schema tasks + reminders email     → Issue #22 (T022)
23. Vista Tareas                       → Issue #23 (T023)
24. Inngest + health                   → Issue #24 (T024)
25. Analytics + Sentry                 → Issue #25 (T025)
--- FIN FASE 1 / INICIO FASE 2 ---
26. Schema documents + chunks          → (ingestion base)
27. Job parse PDF                      → (ingestion)
28. Job chunk + embed                  → (ingestion)
29. Search endpoint (hybrid + rerank)  → (retrieval)
30. Schema conversations + messages    → (chat)
31. Subject chat UI                    → (chat)
32. Chat orchestrator + citations      → (chat)
33. Memoria conversación (summary)     → (chat)
34. Perfil de estudio                  → (chat)
35. Analyze resource job               → (ingestion+)
36. Test generator v0                  → (tests)
37. Test attempt UI + scoring          → (tests)
--- FIN FASE 2 / INICIO FASE 3 ---
38. Google Calendar OAuth              → (sync)
39. Google Calendar pull cron          → (sync)
40. Notificaciones push web            → (notifications)
41. Admin panel mínimo                 → (admin)
42. Dogfooding hardening               → (general)
--- BETA UAL ---
```

**Regla de oro**: Claude Code ejecuta **una issue por sesión**, no varias en paralelo. Se evita pisar archivos y se mantiene PRs pequeños.

---

## E · PROMPTS INTERNOS PARA CLAUDE CODE

Estos prompts viven en `docs/PROMPTS.md` y se pegan como contexto inicial cuando le das una tarea a Claude Code.

### E.0 Prompt maestro (se añade a TODAS las sesiones)

```
Eres el ingeniero principal del proyecto Academic OS.

Stack obligatorio:
- Next.js 15 (App Router), TypeScript strict, Server Components cuando sea posible.
- Supabase (Postgres 15 + Auth + Storage + Realtime), Drizzle ORM.
- Tailwind v4 + shadcn/ui + lucide-react.
- Zod para TODA validación.
- pgvector para embeddings.
- Inngest para jobs > 5s.
- Anthropic API (Claude Sonnet 4.5) para LLM, OpenAI text-embedding-3-small para embeddings.

Reglas no negociables:
1. NUNCA hagas commits directos a main. Siempre rama feat/ fix/ chore/.
2. NUNCA uses `any`. Si necesitas un tipo flexible, define interface o usa `unknown` con narrowing.
3. NUNCA escribas queries crudas a Supabase en componentes React. Server actions o route handlers.
4. NUNCA devuelvas datos sensibles sin pasar por RLS (confía en RLS, no dupliques checks en código excepto para roles).
5. NUNCA crees migración sin revisar que sea reversible.
6. NUNCA pongas claves o secretos en el repo.
7. NUNCA metas lógica de negocio en packages/ui. UI components son presentacionales.
8. Por defecto todo es Server Component. Solo usa `"use client"` cuando necesites interactividad.
9. Usa imports absolutos con los alias (@ui, @db, @ai, @shared).
10. Todas las tablas tienen created_at, updated_at (trigger), y id UUID v7.

Antes de escribir código:
- Lee docs/ARCHITECTURE.md y docs/DB_SCHEMA.md.
- Lee la issue completa.
- Si hay ambigüedad, pregunta ANTES de codear.

Al terminar:
- Corre pnpm typecheck, pnpm lint, pnpm test locales.
- Abre PR con el template.
- Asegúrate de que la descripción explica qué, por qué y cómo probar.
```

### E.1 Prompt: crear schema SQL

```
Tarea: generar el schema Drizzle para el dominio [DOMINIO].

Referencias:
- docs/DB_SCHEMA.md sección [DOMINIO].
- Convenciones: snake_case en DB, camelCase en TS, UUID v7 por defecto, timestamps, enums tipados.

Output esperado:
1. Archivo packages/db/src/schema/[dominio].ts con tablas + enums + relations.
2. Archivo packages/db/src/policies/[dominio].sql con RLS.
3. Migración generada con `drizzle-kit generate`.
4. Índices críticos creados en la migración.
5. Tests unitarios en packages/db/src/__tests__/[dominio].test.ts para:
   - Insert happy path.
   - RLS: user A no lee datos de user B.

Reglas específicas:
- Toda tabla con datos de usuario tiene user_id O pasa por junction table con RLS vía `is_cohort_member(cohort_id)`.
- Usa `jsonb` para datos flexibles que no necesitamos indexar.
- Para enums, usa `pgEnum` de Drizzle.
- NO uses serial/bigserial. UUID v7 con `uuid_generate_v7()` (crear función si no existe).
```

### E.2 Prompt: crear auth + roles

```
Tarea: implementar flujo completo de autenticación con Supabase Auth.

Referencias:
- docs/ARCHITECTURE.md §7 (roles).
- Supabase docs: https://supabase.com/docs/guides/auth

Output esperado:
1. Configuración de Supabase Auth (Google OAuth + magic link email).
2. Página /login con componente <LoginCard>.
3. Route handler /api/auth/callback.
4. Trigger SQL `on_auth_user_created` que inserta fila en `users` y membership pendiente.
5. Middleware Next.js en middleware.ts con matcher correcto.
6. Helper `getSessionUser` en packages/auth/src/session.ts tipado con { user, activeMembership }.
7. Redirects: no auth → /login, auth sin membership → /onboarding.
8. Logout funcional.

Roles en V1:
- student, delegate, admin.
- Se lee de memberships.role cuando el usuario tiene un active membership.
- Helper `requireRole(role, fn)` para server actions.

NO hagas:
- Roles custom en JWT claims (no es necesario, lee de DB).
- Session storage en localStorage (usa cookies Supabase).
- Redirect loops (testea casos edge).
```

### E.3 Prompt: crear dashboard base

```
Tarea: implementar el dashboard home (/dashboard) con las secciones de V1.

Referencias:
- docs/ARCHITECTURE.md §11.3 (Dashboard).
- packages/ui para componentes base.

Output esperado:
1. Página /dashboard (Server Component) que carga en paralelo:
   - Próximos 3 eventos (48h) del usuario.
   - Última conversación abierta (por asignatura con mayor updated_at en messages).
   - Última resource vista (por updated_at en un tracking table si existe, o el más reciente subido).
   - Avisos recientes del cohort (próxima V1 ligera).
2. Grid responsive:
   - Móvil: stack vertical, cada sección full-width.
   - Desktop: 2 columnas, próximos eventos + foco ocupan fila principal.
3. Cada sección es un Server Component con su propio Suspense boundary.
4. Skeleton loaders consistentes.
5. Empty states claros cuando no hay datos.

Queries:
- Usa Drizzle client con RLS activo (cliente con anon key + auth cookie).
- Nunca service role en dashboard.
```

### E.4 Prompt: módulo de asignaturas

```
Tarea: implementar módulo de asignaturas: listado + detalle + tabs.

Referencias:
- docs/ARCHITECTURE.md §11.3 (Vista asignatura).
- Schema en packages/db/src/schema/academic.ts.

Output esperado:
1. Página /subjects con lista de asignaturas del cohort activo.
2. Página /subjects/[subjectId] con layout que contiene tabs.
3. Sub-rutas:
   - /subjects/[id] (default → Resumen)
   - /subjects/[id]/theory
   - /subjects/[id]/practice
   - /subjects/[id]/chat
   - /subjects/[id]/tests
   - /subjects/[id]/calendar
4. Componente <SubjectHeader> con color banner + metadata.
5. Componente <SubjectTabs> con estado de URL.
6. Breadcrumbs en todos los niveles.

Móvil:
- Tabs scrolleables horizontalmente si no caben.
- Header compacto (solo nombre + código).

Data:
- Subjects se leen con RLS filtrando por cohort activo.
- Usa `activeMembership.cohortId` del middleware.
```

### E.5 Prompt: calendario

```
Tarea: implementar vista Calendario con CRUD manual de eventos.

Referencias:
- docs/ARCHITECTURE.md §11.3 (Calendario global).
- Schema en packages/db/src/schema/calendar.ts.

Decisión de librería:
- Evalúa `@fullcalendar/react` vs `react-big-calendar` vs custom.
- Criterios: bundle size, accesibilidad, personalización de render, mobile.
- Documenta la decisión en un ADR corto.

Output esperado:
1. /calendar con vistas mes (desktop) / agenda (mobile default) / día.
2. Filtros por asignatura (pills con color).
3. Modal crear/editar evento (React Hook Form + Zod).
4. Drag & drop desktop para mover eventos (solo eventos source=manual).
5. Swipe móvil para ver detalle.
6. Indicadores visuales por source (ical/google/blackboard/manual).
7. Zona horaria Europe/Madrid por defecto, configurable.

No hagas:
- Integración con Google Calendar aún (issue separada).
- Recurrencia compleja en V1 (solo RRULE básica: daily/weekly/monthly + until).
```

### E.6 Prompt: subida de documentos

```
Tarea: implementar upload de documentos a una asignatura con viewer.

Referencias:
- docs/ARCHITECTURE.md §6.2 (tablas resources, documents).
- Storage bucket `resources` privado con RLS.

Output esperado:
1. Componente <ResourceDropzone> en la tab Teoría/Práctica de una asignatura.
   - Drag&drop web + botón "Subir" en móvil.
   - Soporta: PDF, PNG, JPG, HEIC (convertir a JPG), TXT, MD.
   - Múltiples archivos a la vez.
   - Barra de progreso por archivo.
2. Server action `uploadResource` que:
   - Valida tipo, tamaño (máx 50MB).
   - Sube a Supabase Storage en path `userId/subjectId/filename`.
   - Crea fila `resources`.
   - Crea fila `documents` con status=pending (para pipeline de ingestion futuro).
   - Emite evento Inngest `document.uploaded` (aunque el job consumidor aún no exista, stub).
3. Lista de recursos por topic en la tab con card por archivo.
4. Ruta /subjects/[id]/resources/[resourceId] con viewer:
   - PDF: `react-pdf` con paginación.
   - Imagen: Next/Image con fullscreen zoom.
   - Texto/markdown: render con `react-markdown`.
5. URL firmada expira en 1h.
6. Borrado soft con confirmación modal.

No implementes aún:
- Parsing + chunking + embedding (ingestion pipeline va en otra issue).
- OCR.
- Transcripción audio.
```

### E.7 Prompt: RAG pipeline

```
Tarea: implementar pipeline completo de ingestion de documentos + retrieval híbrido.

Referencias:
- docs/ARCHITECTURE.md §10.5.
- Schema: documents + chunks en packages/db/src/schema/ai.ts.

Output esperado:

## A. Ingestion (jobs Inngest)

1. `document.uploaded` trigger → job `ingestDocument(documentId)`:
   - Descarga archivo de Storage vía service role.
   - Si PDF: extrae texto con unpdf primero, pdf-parse fallback.
   - Si <5% texto extraído y es PDF → aplica OCR con Mistral API.
   - Detecta idioma (franc o simple heurística).
   - Limpia texto (dedupe headers/footers con heurística simple, normaliza whitespace, fix hyphenation).
   - Chunking: `RecursiveCharacterTextSplitter`-style, 500-800 tokens, 50 overlap, respeta secciones si hay headers.
   - Para cada chunk:
     - Calcula tsvector con config español.
     - Embed con OpenAI text-embedding-3-small (batch de 100).
   - Bulk insert en `chunks`.
   - Update `documents.status = indexed`.
   - Emit `document.indexed` event.

2. Manejo de errores:
   - Cualquier fallo → `documents.status = failed`, `processing_error` con mensaje.
   - Retry automático Inngest (max 3).

## B. Retrieval (runtime)

1. Endpoint `searchSubjectMaterials(subjectId, query, topK)` en packages/ai/src/retrieval:
   - Expande query con Haiku: 3 variaciones (literal, conceptual, ES↔EN).
   - Para cada variación:
     - Vector search: cosine similarity limitado a subject_id, top 20.
     - BM25 search: plainto_tsquery con ts_rank, top 20.
   - RRF fusion (k=60).
   - Rerank top 30 con Jina Reranker v2 (API).
   - Return top 8 con score, snippet, page, resource_id, chunk_id.

2. Exposición como server action o tool de LLM.

3. Tests:
   - Un set pequeño en packages/ai/evals/retrieval.eval.ts con 10 (query, expected_chunk_ids).
   - Recall@8 >= 0.7 como gate.

NO hagas en esta issue:
- Chat UI (otra issue).
- Test generator (otra issue).
- Summarize/analyze document (otra issue).
```

### E.8 Prompt: chat por asignatura

```
Tarea: implementar chat con memoria por asignatura usando RAG.

Referencias:
- docs/ARCHITECTURE.md §10.2, §10.4.
- Prompt del sistema en packages/ai/src/prompts/subject-chat.ts.

Output esperado:

## A. UI

1. Tab `/subjects/[id]/chat`:
   - Lista de conversaciones a la izquierda (desktop) / arriba plegable (móvil).
   - Panel principal de mensajes.
   - Input con envío enter + shift-enter para salto de línea.
   - Streaming de respuestas.
   - Citations visibles en cada mensaje asistente: "[1]", "[2]" linkean al PDF en la página.
   - Botón "Nueva conversación".
   - Auto-título de conversación tras 2-3 mensajes.

## B. Orchestrator (packages/ai/src/chat/orchestrator.ts)

1. Función `sendMessage({ conversationId, userMessage })`:
   - Carga últimos 24 mensajes de la conversación.
   - Carga `summary` de la conversación (si existe).
   - Carga `users.study_method` del usuario.
   - Llama a `searchSubjectMaterials(subjectId, userMessage, 8)` → top chunks.
   - Construye prompt con chunks + summary + últimos mensajes + nuevo mensaje.
   - Llama a Anthropic API con streaming + tools.
   - Guarda mensaje usuario + mensaje asistente con citations.
   - Cada 8 mensajes, ejecuta job async `updateConversationSummary(conversationId)`.

## C. Prompt (prompts/subject-chat.ts)

Variables inyectables:
- subjectName, subjectCode
- userName, studyMethod
- retrievedChunks (con source info)
- conversationSummary
- recentMessages

Reglas en el prompt:
- Responde siempre en el idioma de la pregunta del usuario.
- Cita chunks con [N] cuando uses información del material.
- Si la pregunta NO se responde con los chunks, dilo explícitamente.
- Propón próximos pasos útiles al final (ej: "¿Quieres que genere un test sobre X?").
- Adapta nivel de detalle al study_method del usuario.

Tools disponibles:
- search_subject_materials
- create_task
- generate_test

## D. Métricas

- Registra token_usage y cost_cents en cada mensaje.
- Emit event `chat.message.sent` a PostHog.
```

### E.9 Prompt: test generator

```
Tarea: implementar generador de tests interactivos con corrección.

Referencias:
- docs/ARCHITECTURE.md §10.8.

Output esperado:

## A. Generación

1. Server action `generateTest({ subjectId, topicId?, numQuestions, difficulty, types })`:
   - Si topicId: recupera chunks de ese topic (top 30).
   - Si no: chunks de la asignatura completa.
   - Prompt dedicado pide N preguntas en JSON:
     ```
     {
       questions: [
         { id, type, prompt, options?, correctAnswer, explanation, sourceChunkIds }
       ]
     }
     ```
   - Validación Zod estricta.
   - Segundo pass con Haiku: "¿Cada pregunta es contestable solo con los chunks citados?". Las que no pasan se descartan.
   - Guarda en `generated_tests`.

## B. UI del test

1. Ruta /subjects/[id]/tests/[testId]:
   - Una pregunta en pantalla con progress bar.
   - Navegación prev/next.
   - Timer opcional.
   - En móvil: gestos para avanzar.

2. Al terminar → UI de corrección:
   - Score global.
   - Por pregunta: respuesta, correcta, explicación.
   - Click en explicación expande chunk fuente con link al PDF.

3. Guarda attempt en `test_attempts`.

## C. Retroalimentación al perfil

- Preguntas falladas actualizan un contador por topic en `users.study_method.weak_topics` (jsonb).
- UI muestra "Tus temas débiles" en la tab Tests.

Types soportados V1:
- multiple_choice (4 opciones)
- true_false
- short_answer (corrección lexical + LLM)
- numeric (tolerancia configurable)
```

### E.10 Prompt: transcripción audio (V2)

```
Tarea: implementar transcripción de audios de clase + análisis.

Referencias:
- docs/ARCHITECTURE.md §10.10.

Output esperado:

## A. Upload

1. Extiende <ResourceDropzone> para aceptar audio (m4a, mp3, wav, ogg).
2. Si > 25MB → avisa de límite Whisper, ofrece opción de recortar o subir segmentado.

## B. Pipeline (Inngest)

1. Job `transcribeAudio(resourceId)`:
   - Descarga audio.
   - Si > 20MB: parte en chunks de 10 min con ffmpeg en serverless (o contrata Fly container si no viable).
   - Whisper API con language=es.
   - Reensambla con timestamps.
   - Guarda transcript en `resources.transcript` (text) y como recurso indexable.
   - Emit `audio.transcribed`.

2. Job `generateClassMinutes(resourceId)`:
   - Prompt dedicado → genera:
     - Resumen (200 palabras).
     - Bullets por tema.
     - Dudas detectadas ("no quedó claro", "luego lo vemos").
     - Deberes mencionados ("para el lunes haced…").
   - Guarda en `resources.analysis` jsonb.
   - Auto-crea tasks para los deberes detectados (status=todo, due_at parseado).

## C. UI

1. Viewer de audio: player + transcript sincronizado (highlight palabra actual).
2. Acta de clase en panel lateral con secciones desplegables.
3. Editor de transcript inline (usuario puede corregir).
4. Botón "Regenerar acta" después de editar.

Precios:
- Whisper = $0.006/min. Cron que alerta si > 20€/mes por usuario.
```

### E.11 Prompt: canales de clase (V2)

```
Tarea: implementar canales por asignatura con hilos y menciones.

Referencias:
- docs/ARCHITECTURE.md §8.

Output esperado:

## A. Schema
- Tablas channels, channel_members, channel_messages, channel_reactions ya creadas (issue separada).

## B. UI

1. Ruta /cohort/channels con sidebar de canales + panel de mensajes.
2. Al crear cohort: auto-crear 1 canal por cada subject + 1 "general".
3. Panel mensajes:
   - Scroll infinito hacia arriba.
   - Input con markdown simple + adjuntos (reutilizando <ResourceDropzone>).
   - Menciones @nombre con popover.
   - Reacciones emoji (picker ligero, ~20 emojis).
   - Hilos: click en mensaje → panel lateral con respuestas.
4. Móvil: bottom sheet para hilo.

## C. Realtime
- Supabase Realtime subscription por channel_id.
- Optimistic UI al enviar.
- Indicadores de "X escribiendo" (opcional V2.1).

## D. Moderación
- Delegate: pin mensaje, borrar mensajes ajenos, silenciar usuario 24h.
- Admin: idem + permaban.

## E. Anti-ruido
- Mute por canal (muted=true en channel_members).
- Quiet hours en users.preferences.
- Digest email diario (otro job).

NO hagas:
- DMs entre alumnos (no en V2).
- Voz/vídeo (nunca propio, integración externa si acaso en V3).
- Encriptación E2E (no aplica para contenido académico público de clase).
```

### E.12 Prompt: notificaciones

```
Tarea: sistema de notificaciones email + push web + in-app.

Referencias:
- docs/ARCHITECTURE.md §8.3, §10.13.
- Tabla notifications en schema system.

Output esperado:

## A. Backend

1. Paquete `packages/notifications` con:
   - `dispatchNotification({ userId, kind, payload })`.
   - Lee preferencias del usuario (users.preferences.notifications).
   - Decide canales: email, push, inapp.
   - Crea fila en notifications.
   - Encola jobs según canal.

2. Kinds V1:
   - `task.due_soon`
   - `event.changed`
   - `ical.sync.completed`
   - `document.indexed`
   - (V2) `mention.channel_message`
   - (V2) `delegate.pinned_message`

3. Render con React Email templates.

## B. Push web

1. Service Worker en apps/web/public/sw.js.
2. Suscripción al cargar la app (pregunta permiso en momento correcto, no on load).
3. Guardar subscription en users.preferences.push_subscriptions.
4. Endpoint `/api/notifications/push-test` para probar desde settings.

## C. In-app

1. Campanilla en TopBar con unread count.
2. Dropdown con últimas 20 notificaciones.
3. Ruta /notifications con historial completo.
4. Marcar como leído on-click.

## D. Settings
- Toggle por kind y por canal.
- Quiet hours con horario.
- Test button por canal.
```

### E.13 Prompt: analítica de estudio (V2)

```
Tarea: implementar métricas personales de estudio + detección de debilidades.

Referencias:
- docs/ARCHITECTURE.md §10.12.

Output esperado:

## A. Recolección

1. Hook `<StudySessionTracker>` que envuelve vistas de asignatura y trackea tiempo activo.
2. Registra study_session al cerrar sesión (blur + timeout).
3. Eventos explícitos: test completado, chat enviado, recurso abierto.

## B. Agregación

1. Job nocturno `computeUserMetrics(userId)`:
   - horas por asignatura (semana, mes).
   - % aciertos por topic en tests.
   - tiempo medio por recurso.
   - conceptos repetidos en chat (agrupación por embedding de preguntas).

## C. UI

1. Ruta /me/analytics:
   - Heatmap de actividad (últimas 12 semanas).
   - Gráfico horas por asignatura.
   - Top 3 temas débiles.
   - Racha actual.
2. Por asignatura: métricas específicas en tab Tests.

## D. Acción

- Las debilidades detectadas alimentan al Planner v1.
- Sugerencia proactiva en Dashboard: "Lleva 2 semanas sin revisar Química. ¿Sesión de 25 min?".

No hagas:
- Leaderboards.
- XP/gamificación (opt-in V3 si acaso).
- Exportar datos a terceros.
```

---

## Cierre

Este documento es la base. Todo cambio estructural se discute con ADR. Todo cambio de prompt crítico pasa eval. Todo PR respeta la Definition of Done.

**Lo único que importa ahora**: Óliver crea el repo hoy, Armando bootstrap semana que viene, y en 10 semanas estáis usando esto con las asignaturas reales de Matemáticas II, Física II, Estadística, Programación y Tecnología de la Fabricación.

**Manos a la obra.**
