# DB_SCHEMA.md

> Esquema canónico de Academic OS. Fuente de verdad: `packages/db/src/schema/*.ts` y `packages/db/migrations/*.sql`. Si este documento contradice al código, el código manda — abre un PR que corrija el docu.

---

## 1. Resumen

- Motor: Postgres 15 (Supabase Cloud).
- ORM: Drizzle. Un archivo por dominio en `packages/db/src/schema/`: `identity.ts`, `academic.ts`, `materials.ts`, `calendar.ts`, `ai.ts`.
- Extensiones: `pgcrypto`, `uuid-ossp`, `vector`, `pg_cron`, `pg_net`.
- 17 tablas V1 (dominios agrupados abajo) + 2 tablas de IA adicionales (`generated_tests`, `test_attempts`) ya declaradas en `ai.ts`.
- Multi-tenant por **RLS** a nivel de fila: `universities → degree_programs → cohorts → memberships`. Todo filtro de usuario cae por `auth.uid()`.

---

## 2. Diagrama ERD (ASCII)

```
                       ┌────────────────────┐
                       │   universities     │
                       │ id, slug, name,    │
                       │ country, locale    │
                       └─────────┬──────────┘
                                 │
                                 │ 1:N
                                 ▼
                       ┌────────────────────┐
                       │  degree_programs   │
                       │ id, university_id, │
                       │ code, name, kind   │
                       └─────────┬──────────┘
                                 │ 1:N
                                 ▼
                       ┌────────────────────┐
 ┌────────────┐        │      cohorts       │
 │   users    │        │ id, degree_id,     │
 │  (mirror   │        │ academic_year,     │
 │ auth.uid)  │        │ period, group_code │
 └─────┬──────┘        └─────────┬──────────┘
       │                         │
       │                         │
       ▼ N                     N ▼
       ┌────────────────────────────────────┐
       │          memberships               │
       │ user_id, university_id,            │
       │ degree_program_id, cohort_id,      │
       │ role(student|delegate|admin),      │
       │ status(active|inactive|…)          │
       └────────────────────────────────────┘
                         │
                         │ cohort_id
                         ▼
                 ┌────────────────┐          ┌────────────────┐
                 │   subjects     │◄─────────┤ subject_members│
                 │ cohort_id,     │  M:N     │ subject_id,    │
                 │ code, name,    │          │ user_id, role  │
                 │ credits…       │          └────────────────┘
                 └───┬───────┬────┘
                     │       │
                     │       │ 1:N
                     │       ▼
                     │   ┌────────────┐
                     │   │  topics    │ (self-ref: parent_topic_id)
                     │   │ subject_id │
                     │   │ name, kind │
                     │   └─────┬──────┘
                     │         │
                     │         │
           1:N ◄─────┘         ▼
         ┌────────────────────────────┐          ┌────────────────┐
         │        resources           │◄─1:1────►│   documents    │
         │ subject_id, topic_id?,     │          │ resource_id UQ │
         │ owner_user_id, kind,       │          │ status, pages, │
         │ storage_path, scope        │          │ indexed_at …   │
         └─────────────┬──────────────┘          └────────────────┘
                       │ 1:N
                       ▼
               ┌──────────────┐     1:N   ┌──────────────────┐
               │   chunks     │───────────►   conversations  │
               │ document_id, │           │ user_id, subject │
               │ subject_id,  │           └────────┬─────────┘
               │ embedding    │                    │ 1:N
               │ vector(1536) │                    ▼
               └──────────────┘           ┌──────────────────┐
                                          │     messages     │
                                          │ conversation_id, │
                                          │ role, content,   │
                                          │ citations[]      │
                                          └──────────────────┘

             Calendario / tareas (dominio ortogonal):

        ┌──────────┐        ┌────────┐        ┌───────────┐
        │  events  │◄───┐   │ tasks  │───┐   │ reminders  │
        │ cohort_  │    │   │ user,  │   └──►│ user, task,│
        │ subject? │    └──►│ subject│       │ event?,    │
        └──────────┘        └────────┘       │ channel    │
                                             └────────────┘

        ┌──────────────────┐
        │  integrations    │  (per-user OAuth tokens)
        │ user_id, provider│
        └──────────────────┘
```

---

## 3. Tablas por dominio

### 3.1 Identity — `packages/db/src/schema/identity.ts`

**`universities`**
| columna      | tipo        | notas                                   |
| ------------ | ----------- | --------------------------------------- |
| id           | uuid PK     | `defaultRandom()`                       |
| slug         | text        | UNIQUE NOT NULL                         |
| name         | text        | NOT NULL                                |
| country      | text        | NOT NULL                                |
| locale       | text        | NOT NULL DEFAULT `'es'`                 |
| created_at   | timestamptz | NOT NULL DEFAULT now()                  |

**`degree_programs`**
| columna        | tipo            | notas                                           |
| -------------- | --------------- | ----------------------------------------------- |
| id             | uuid PK         |                                                 |
| university_id  | uuid FK→univ    | ON DELETE CASCADE                               |
| code           | text            | NOT NULL                                        |
| name           | text            | NOT NULL                                        |
| kind           | enum degree_kind| `bachelor|master|phd|associate` · default bachelor |
| created_at     | timestamptz     |                                                 |
| UNIQUE (university_id, code) · index `idx_degree_programs_university`             |

**`cohorts`**
| columna            | tipo         | notas                            |
| ------------------ | ------------ | -------------------------------- |
| id                 | uuid PK      |                                  |
| degree_program_id  | uuid FK      | ON DELETE CASCADE                |
| academic_year      | text         | e.g. `'2025/26'`                 |
| period             | text         | e.g. `'1Q'`                      |
| group_code         | text         |                                  |
| created_at         | timestamptz  |                                  |
| UNIQUE (degree_program_id, academic_year, period, group_code)                   |

**`users`** (mirror de `auth.users.id`)
| columna       | tipo        | notas                                  |
| ------------- | ----------- | -------------------------------------- |
| id            | uuid PK     | **No defaultRandom** — sembrado = auth.uid() |
| email         | text UNIQUE | NOT NULL                               |
| full_name     | text        |                                        |
| avatar_url    | text        |                                        |
| preferences   | jsonb       | tema, idioma, etc.                     |
| study_method  | jsonb       | perfil pedagógico                      |
| created_at    | timestamptz |                                        |

**`memberships`**
| columna            | tipo               | notas                                   |
| ------------------ | ------------------ | --------------------------------------- |
| id                 | uuid PK            |                                         |
| user_id            | uuid FK→users      | CASCADE                                 |
| university_id      | uuid FK            | CASCADE                                 |
| degree_program_id  | uuid FK            | CASCADE                                 |
| cohort_id          | uuid FK            | CASCADE                                 |
| role               | enum               | `student|delegate|admin`                |
| status             | enum               | `active|inactive|suspended|pending`     |
| joined_at          | timestamptz        |                                         |
| UNIQUE (user_id, cohort_id) · idx user / cohort / university                   |

### 3.2 Academic — `packages/db/src/schema/academic.ts`

**`subjects`**
| columna       | tipo        | notas                                     |
| ------------- | ----------- | ----------------------------------------- |
| id            | uuid PK     |                                           |
| cohort_id     | uuid FK     | CASCADE                                   |
| university_id | uuid FK     | CASCADE                                   |
| code          | text        | NOT NULL                                  |
| name          | text        | NOT NULL                                  |
| color         | text        |                                           |
| credits       | smallint    |                                           |
| semester      | smallint    |                                           |
| is_active     | boolean     | NOT NULL DEFAULT true                     |
| UNIQUE (cohort_id, code) · idx cohort / university                              |

**`subject_members`**
| columna      | tipo        | notas                                                |
| ------------ | ----------- | ---------------------------------------------------- |
| id           | uuid PK     |                                                      |
| subject_id   | uuid FK     | CASCADE                                              |
| user_id      | uuid FK     | CASCADE                                              |
| role         | enum        | `student|professor|assistant` · default student      |
| UNIQUE (subject_id, user_id)                                                        |

**`topics`** (temario; jerarquía por `parent_topic_id`)
| columna           | tipo     | notas                                          |
| ----------------- | -------- | ---------------------------------------------- |
| id                | uuid PK  |                                                |
| subject_id        | uuid FK  | CASCADE                                        |
| parent_topic_id   | uuid     | self-ref (no cascade declarado)                |
| order_index       | integer  | NOT NULL DEFAULT 0                             |
| name              | text     |                                                |
| kind              | enum     | `theory|practice|lab|exam_unit`                |

### 3.3 Materials — `packages/db/src/schema/materials.ts`

**`resources`**
| columna         | tipo        | notas                                                       |
| --------------- | ----------- | ----------------------------------------------------------- |
| id              | uuid PK     |                                                             |
| subject_id      | uuid FK     | CASCADE                                                     |
| topic_id        | uuid FK?    | SET NULL                                                    |
| owner_user_id   | uuid FK     | CASCADE                                                     |
| kind            | enum        | `pdf|image|text_note|audio|url`                             |
| title           | text        |                                                             |
| source          | enum        | `user_upload|ical_import|blackboard_sync|manual`            |
| storage_path    | text        | path en bucket `materials`                                  |
| mime_type       | text        |                                                             |
| bytes           | bigint      |                                                             |
| scope           | enum        | `personal|subject_shared|cohort_shared`                     |
| deleted_at      | timestamptz | soft delete                                                 |

**`documents`** (1:1 con `resources` para PDFs indexables)
| columna           | tipo     | notas                                    |
| ----------------- | -------- | ---------------------------------------- |
| id                | uuid PK  |                                          |
| resource_id       | uuid UNIQUE FK | CASCADE                            |
| status            | enum     | `pending|processing|indexed|failed`      |
| pages             | integer  |                                          |
| text_extracted    | boolean  | default false                            |
| language          | text     |                                          |
| processing_error  | text     | mensaje tras fallo                       |
| indexed_at        | timestamptz |                                       |

### 3.4 Calendar — `packages/db/src/schema/calendar.ts`

**`events`**
| columna         | tipo        | notas                                                        |
| --------------- | ----------- | ------------------------------------------------------------ |
| id              | uuid PK     |                                                              |
| subject_id      | uuid FK?    | SET NULL                                                     |
| cohort_id       | uuid FK?    | SET NULL                                                     |
| owner_user_id   | uuid FK?    | CASCADE                                                      |
| title           | text        |                                                              |
| description     | text        |                                                              |
| start_at        | timestamptz | NOT NULL                                                     |
| end_at          | timestamptz |                                                              |
| location        | text        |                                                              |
| kind            | enum        | `class|exam|deadline|study_session|personal`                 |
| source          | enum        | `manual|ical|google_calendar|blackboard`                     |
| external_id     | text        | id de la fuente origen para dedupe                           |
| color           | text        |                                                              |
| is_all_day      | boolean     |                                                              |
| is_official     | boolean     |                                                              |

**`tasks`**
| columna           | tipo        | notas                                      |
| ----------------- | ----------- | ------------------------------------------ |
| id                | uuid PK     |                                            |
| user_id           | uuid FK     | CASCADE                                    |
| subject_id        | uuid FK?    | SET NULL                                   |
| event_id          | uuid FK?    | SET NULL                                   |
| title / desc      | text        |                                            |
| due_at            | timestamptz |                                            |
| status            | enum        | `todo|doing|done|archived`                 |
| priority          | smallint    | default 0                                  |
| estimated_minutes | smallint    |                                            |
| completed_at      | timestamptz |                                            |

**`reminders`**
| columna     | tipo        | notas                                |
| ----------- | ----------- | ------------------------------------ |
| id          | uuid PK     |                                      |
| task_id     | uuid FK?    | CASCADE                              |
| event_id    | uuid FK?    | CASCADE                              |
| user_id     | uuid FK     | CASCADE                              |
| remind_at   | timestamptz | NOT NULL                             |
| channel     | enum        | `email|push|inapp`                   |
| sent_at     | timestamptz |                                      |

**`integrations`**
| columna       | tipo        | notas                                               |
| ------------- | ----------- | --------------------------------------------------- |
| id            | uuid PK     |                                                     |
| user_id       | uuid FK     | CASCADE                                             |
| provider      | enum        | `google_calendar|ical_url|blackboard_ext`           |
| access_token  | text        | **se espera encriptado a nivel app, nunca plano**   |
| refresh_token | text        | idem                                                |
| expires_at    | timestamptz |                                                     |
| scopes        | jsonb       | string[]                                            |
| metadata      | jsonb       | arbitrario                                          |
| is_active     | boolean     | default true                                        |

### 3.5 AI — `packages/db/src/schema/ai.ts`

**`chunks`** (trozos indexables con embedding)
| columna       | tipo               | notas                                                   |
| ------------- | ------------------ | ------------------------------------------------------- |
| id            | uuid PK            |                                                         |
| document_id   | uuid FK→resources  | CASCADE *(referencia `resources.id` por decisión del esquema)* |
| subject_id    | uuid FK            | CASCADE                                                 |
| topic_id      | uuid FK?           | SET NULL                                                |
| chunk_index   | integer            |                                                         |
| content       | text               |                                                         |
| embedding     | vector(1536)       | pgvector — HNSW index aparte                            |
| token_count   | integer            |                                                         |
| page_from/to  | integer            |                                                         |

`content_tsv` lo mantiene un trigger DB (ver migración). Índices:
- `idx_chunks_embedding` USING hnsw (embedding vector_cosine_ops)
- `idx_chunks_fts` USING gin(to_tsvector('spanish', content))
- `idx_chunks_subject`, `idx_chunks_document`

**`conversations`**
| columna     | tipo        | notas                          |
| ----------- | ----------- | ------------------------------ |
| id          | uuid PK     |                                |
| user_id     | uuid FK     | CASCADE                        |
| subject_id  | uuid FK     | CASCADE                        |
| title       | text        | default `'Nueva conversación'` |
| pinned      | boolean     |                                |

**`messages`**
| columna          | tipo        | notas                                               |
| ---------------- | ----------- | --------------------------------------------------- |
| id               | uuid PK     |                                                     |
| conversation_id  | uuid FK     | CASCADE                                             |
| role             | enum        | `user|assistant|system|tool`                        |
| content          | jsonb       | `{text}` o `{toolUse}`                              |
| citations        | jsonb       | `[{ chunkId, snippet }]`                            |
| token_usage      | jsonb       | `{ input, output }`                                 |
| model            | text        | id del modelo usado                                 |
| idx `idx_messages_conv (conversation_id, created_at)`                                |

> Además en `ai.ts` viven `generated_tests` y `test_attempts` (módulo de tests generados). No se cuentan en el set V1 de 17 tablas del dominio núcleo pero ya están en el código.

---

## 4. RLS por dominio (qué enforza Postgres)

Origen: `packages/db/migrations/0002_rls_helpers_policies.sql` y `0003_rls_materials_calendar_ai.sql`.

**Helpers (SECURITY DEFINER, evitan recursión):**
- `is_cohort_member(cohort_id)` — el usuario tiene membership activa en ese cohort.
- `my_active_cohort_ids()` — setof de cohort_id activos para `auth.uid()`.
- `is_cohort_manager(cohort_id)` — role ∈ {delegate, admin}.

**Identity:**
- `universities`, `degree_programs`, `cohorts`: SELECT público (catálogo), escritura solo `service_role`.
- `users`: SELECT propia fila; SELECT compañeros mismo cohort; UPDATE solo propia fila.
- `memberships`: SELECT propias + gestionables por `is_cohort_manager`.

**Academic / Materials / Calendar / AI:** políticas restringen por `is_cohort_member(...)` sobre el cohort del subject, o por `owner_user_id = auth.uid()` para recursos personales. `resources.scope` controla visibilidad adicional (`personal` → solo owner; `cohort_shared` → todo el cohort).

**Storage:** bucket `materials` con política RLS paralela (migración `0004_storage_materials.sql`) que limita lectura/escritura por cohort + owner.

---

## 5. Índices críticos (y por qué)

| Índice                                              | Tabla           | Motivo                                                           |
| --------------------------------------------------- | --------------- | ---------------------------------------------------------------- |
| `idx_memberships_user`, `_cohort`, `_university`    | memberships     | middleware + RLS joins en cada request                           |
| `uq_memberships_user_cohort`                        | memberships     | evita duplicados por cohort                                      |
| `idx_subjects_cohort`                               | subjects        | lista de asignaturas del usuario                                 |
| `idx_subject_members_user` / `_subject`             | subject_members | matrícula                                                        |
| `idx_resources_subject_topic`                       | resources       | explorador de materiales                                         |
| `idx_events_owner_start`, `_cohort_start`           | events          | consultas por ventana temporal                                   |
| `idx_tasks_user_due`                                | tasks           | inbox "qué tengo que hacer"                                      |
| `idx_messages_conv (conversation_id, created_at)`   | messages        | paginación de chat                                               |
| `idx_chunks_embedding` HNSW cosine                  | chunks          | retrieval vectorial O(log n) para RAG                            |
| `idx_chunks_fts` GIN tsvector('spanish')            | chunks          | búsqueda textual híbrida                                         |
| `idx_conversations_user_subject`                    | conversations   | listar chats por asignatura                                      |
| `idx_integrations_user_provider`, `_active`         | integrations    | lookup OAuth por proveedor                                       |
| `idx_documents_status`                              | documents       | cola de jobs pendientes / fallidos                               |

---

## 6. Notas de evolución

- `chunks.document_id` referencia `resources.id` (no `documents.id`) — decisión del schema: el vínculo operativo vive con el recurso físico. No cambiar sin migración.
- `users.id` no tiene `defaultRandom()`: **siempre** viene de `auth.users.id`.
- Añadir tabla = schema file + migración `drizzle-kit generate` + política RLS + documentación aquí.
