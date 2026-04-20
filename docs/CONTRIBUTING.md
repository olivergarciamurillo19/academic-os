# CONTRIBUTING.md

> Reglas de colaboración para Academic OS. Óliver (frontend) y Armando (backend) trabajan en paralelo sin pisarse.

---

## 1. Setup local

Setup paso a paso en [`docs/setup/MAC_SETUP.md`](./setup/MAC_SETUP.md). Variables de entorno en [`docs/setup/ENV_VARS.md`](./setup/ENV_VARS.md). Resumen rápido:

```bash
nvm use                          # Node 20
corepack enable && corepack prepare pnpm@10 --activate
pnpm install
cp .env.example .env.local       # pedir secretos a Óliver/Armando
pnpm db:migrate                  # aplica migraciones a Supabase
pnpm db:seed                     # carga semilla UAL
pnpm dev                         # Turbopack en apps/web
```

---

## 2. Estrategia de ramas

| Rama                   | Dueño    | Para qué                                                |
| ---------------------- | -------- | ------------------------------------------------------- |
| `main`                 | **bloqueada** | Base de despliegues. Solo merge vía PR con CI verde. |
| `feat/oliver-frontend` | Óliver   | UI, App Router, componentes, server actions de UI       |
| `feat/armando-backend` | Armando  | Schema, RLS, jobs Inngest, pipelines IA                 |
| `feat/infrastructure`  | Compartida | CI, deploys, scripts, docs transversales             |

Reglas duras:

1. **Nunca** commit directo a `main`.
2. **Nunca** `git push --force` a `main`.
3. Antes de empezar tarea: `git pull origin <rama-del-otro>` para estar al día.
4. Rama de trabajo nace de la propia `feat/*` personal, **no de main** para evitar conflictos constantes.
5. PR contra `main` únicamente cuando la feature esté completa (con DoD ✔).
6. Si dos ramas se cruzan sobre el mismo fichero: merge por rebase en **la rama más reciente** para preservar historia lineal.

---

## 3. Conventional Commits

Formato estricto:

```
<type>(<scope>): <descripción en imperativo, minúsculas, sin punto final>
```

**Types permitidos:** `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`, `build`, `ci`, `style`, `revert`.

**Scopes típicos:** `auth`, `db`, `schema`, `ui`, `ai`, `middleware`, `api`, `jobs`, `seed`, `config`, `docs`, `deps`.

**Ejemplos reales del repo:**

```
feat(auth): minimal /login page with supabase magic link + google oauth
fix(middleware): exclude /api/** from auth redirect so route handlers can return JSON 401 instead of HTML redirect
feat(data): connect chat to openai, dashboard + onboarding to drizzle
fix(auth): magic link confirm route oauth callback handler
feat(api): ai chat stream tests inngest routes
```

Cuerpo opcional (separado por línea en blanco) para el "por qué". No pegues stack traces: enlazalos a Sentry/issue.

**Breaking change:** añadir `!` después del scope o bloque `BREAKING CHANGE:` en el cuerpo.

---

## 4. Pull Requests

**Título del PR** = commit principal (misma forma Conventional Commits).

**Plantilla de descripción:**

```md
## Qué
Una línea que resuma el cambio.

## Por qué
Enlace al issue o razón de producto.

## Cómo probar
Pasos reproducibles (incluye URL preview de Vercel cuando aplique).

## Screenshots / vídeos
Para cambios de UI. Antes / después.

## Checklist
- [ ] Tipos OK (`pnpm typecheck`)
- [ ] Lint OK (`pnpm lint`)
- [ ] Migración incluida si toca schema
- [ ] Docs actualizados si cambia contrato
```

Reglas:

- **1 PR = 1 propósito.** Si refactorizas de paso, PR aparte.
- Diff pequeño > diff heroico. < 400 líneas es el objetivo.
- CI (`typecheck + lint + build`) **tiene que estar en verde** antes de pedir review.
- Al menos **1 approval** del otro owner. Si es infra genérica, cualquiera de los dos.
- Squash merge por defecto (historia limpia en `main`).

---

## 5. Definition of Done

Una tarea está hecha cuando cumple **todo** esto:

- [ ] **Tipo-check** pasa (`pnpm typecheck`).
- [ ] **Lint** pasa (`pnpm lint`).
- [ ] **Build** pasa localmente (`pnpm build`).
- [ ] **Tests** añadidos o actualizados (si hay lógica no trivial).
- [ ] **Migración DB** incluida y probada localmente (`pnpm db:migrate`) si toca schema.
- [ ] **RLS** revisada: toda nueva tabla tiene policies y está cubierta por `is_cohort_member` o equivalente.
- [ ] **Variables de entorno** añadidas a `.env.example` y a `docs/setup/ENV_VARS.md` si hay nuevas.
- [ ] **Docs** actualizados (`ARCHITECTURE.md` / `DB_SCHEMA.md` / ADR si aplica).
- [ ] **Preview de Vercel** verificada en el PR.
- [ ] **Sin `console.log`** sueltos ni TODOs "arréglalo luego" sin issue asociada.
- [ ] **Sentry y PostHog** no rotos: abre la preview, haz el flujo, verifica que no aparecen errores nuevos.
- [ ] **A11y básica**: Tab navigation, labels en inputs, contraste aceptable en UI nueva.

Si un punto no aplica, márcalo como N/A con una línea de justificación.

---

## 6. Qué NO hacer

- No meter secretos en git. `.env.local` y `.env.*.local` están en `.gitignore`; si se filtra una clave → rotar inmediatamente en Supabase/OpenAI/Anthropic.
- No usar `any` sin comentario justificando. Preferir `unknown` + narrowing.
- No consumir `SUPABASE_SERVICE_ROLE_KEY` desde componentes cliente (solo server actions, route handlers server, jobs).
- No añadir dependencia pesada sin PR separado justificándola.
- No pelear con RLS desde código: si la policy bloquea algo que debería permitir, el fix va en la policy, no en un `service_role` bypass.
