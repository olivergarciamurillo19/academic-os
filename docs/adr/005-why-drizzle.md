# ADR 002 — Drizzle ORM como capa de acceso a datos

- **Título:** Usar Drizzle ORM (SQL-first, type-safe) en lugar de Prisma u otras alternativas.
- **Status:** Accepted
- **Fecha:** 2026-04-20
- **Deciders:** Óliver, Armando

> Nota: este ADR cubre la decisión de ORM. Existe también un `002-calendar-library.md` (elección de librería de calendario); se renombrará en un PR aparte para evitar el choque de numeración.

---

## Contexto

Necesitamos una capa de acceso a Postgres en el monorepo (`packages/db`) con estos requisitos:

1. **Type-safety end-to-end** entre schema, queries y callsites (zero-any donde razonable).
2. **Compatibilidad con pgvector** (columna `vector(1536)`). Soporte directo o hueco limpio para customType.
3. **Edge-friendly** (algunos endpoints pueden correr en Vercel Edge), y desde luego **ESM-nativo**.
4. **Control del SQL emitido** — para tunear RAG queries (`<=>` cosine, GIN tsvector híbrido).
5. Migraciones versionadas en Git, reversibles manualmente.
6. Footprint ligero — estamos en serverless, cada ms de cold start cuenta.

El candidato natural es **Prisma** (el más popular en Next.js), seguido de Drizzle, Kysely o raw `postgres`/`node-postgres`.

## Decisión

Adoptar **Drizzle ORM** v0.42+ como única capa de acceso a Postgres en el monorepo.

- Schema dividido por dominio en `packages/db/src/schema/{identity,academic,materials,calendar,ai}.ts`.
- Migraciones SQL generadas por `drizzle-kit` en `packages/db/migrations/*.sql`.
- Cliente importable desde `@academic-os/db` en `apps/web`, `packages/ai`, scripts seed.
- pgvector modelado con un `customType` propio (ver `packages/db/src/schema/ai.ts`) — definido una vez, reutilizable.
- Tipos de tablas → tipos TS via `$inferSelect` / `$inferInsert` sin generadores externos.

## Consecuencias

### Positivas

- **SQL-first**: lo que escribes se parece al SQL real. Cuando hay que tunear una query compleja (vector + full-text + RLS-friendly), Drizzle no esconde nada.
- **Sin codegen runtime**: no hay `prisma generate` antes de cada build; el tipo sale directamente del archivo `.ts` del schema. Builds más rápidos en CI.
- **Bundle más pequeño** (< 100 KB gzip) frente a Prisma (> 1 MB binario + runtime). Importante en Vercel Edge / serverless.
- **pgvector vía `customType`** limpio — Prisma aún no soporta `vector` de forma nativa en 2026; obligaría a `Unsupported` + queries crudas.
- **ESM nativo**; integra sin fricción con el monorepo ESM (`"type": "module"`).
- **Migraciones son SQL legible**: cualquiera puede revisar el diff en un PR sin aprender un DSL. Facilita RLS (escribir `CREATE POLICY` directamente al lado).
- **Drizzle Studio** (`pnpm db:studio`) da un Prisma Studio-like gratis para explorar datos.

### Negativas

- **Comunidad más pequeña** que Prisma. Menos Stack Overflow, más leer docs oficiales.
- **Superficie del API evoluciona rápido** (< 1.0); requiere pinear versiones y leer changelogs en bumps.
- **Sin features de Prisma como soft-delete middleware o logs estructurados integrados** — hay que componerlos tú mismo.
- **Relations API** menos elegante cuando hay M:N complejos — manejable pero verboso.

### Neutras

- El equipo aprende Drizzle en lugar de Prisma. Para un bootcamp de 2 personas con buen SQL, es ventaja; para contratar luego, Prisma tendría más candidates out-of-the-box.

## Alternativas consideradas

| Alternativa          | Por qué no                                                                                                  |
| -------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Prisma**           | Codegen runtime pesado, bundle grande, `Unsupported("vector")` para pgvector, DSL que esconde SQL justo en las queries que más necesitamos controlar (RAG). |
| **Kysely**           | Query builder puro sin schema-first — perdemos la fuente de verdad de tipos. Potente pero más manual.       |
| **TypeORM / MikroORM** | Decorators, metadata, reflection — demasiado pesado para la escala que buscamos; peor DX edge.             |
| **Raw `postgres` / `node-postgres`** | Sin type-safety estructural. Mantenible para una app pequeña, no para 17 tablas + RLS + RAG.      |
| **Hasura / PostgREST** | REST/GraphQL auto-generado sobre Postgres — potente pero añade otra capa de infra; redundante con Supabase auto-APIs que tampoco usamos. |

## Revisión

Se revisa si:

- Drizzle abandona desarrollo o su API cambia drásticamente en un major.
- Aparece un bug de rendimiento significativo vs alternativa.
- Nos encontramos escribiendo ≥ 30% de queries en SQL crudo — síntoma de que el ORM estorba.
