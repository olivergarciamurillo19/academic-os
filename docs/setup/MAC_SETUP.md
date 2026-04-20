# MAC_SETUP.md

> Setup de Academic OS en macOS (Apple Silicon o Intel) desde cero. Pensado para empezar y tener el dashboard local funcionando en ~15 minutos.

---

## 1. Requisitos previos

Abre Terminal. Verifica tu shell con `echo $SHELL` (suele ser `/bin/zsh` en macOS ≥ Catalina).

### 1.1 Homebrew

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

En Apple Silicon añade Homebrew al PATH (el instalador te lo imprime al final):

```bash
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zshrc
source ~/.zshrc
```

### 1.2 Git

```bash
brew install git
git --version   # >= 2.40
```

### 1.3 nvm + Node 20

```bash
brew install nvm
mkdir -p ~/.nvm
cat >> ~/.zshrc <<'EOF'
export NVM_DIR="$HOME/.nvm"
[ -s "/opt/homebrew/opt/nvm/nvm.sh" ] && \. "/opt/homebrew/opt/nvm/nvm.sh"
EOF
source ~/.zshrc

nvm install 20
nvm use 20          # respeta .nvmrc del repo
node -v             # v20.x
```

### 1.4 pnpm 10 (via corepack)

```bash
corepack enable
corepack prepare pnpm@10.0.0 --activate
pnpm -v             # 10.0.0
```

El `packageManager` del `package.json` raíz pinnea la versión (`pnpm@10.0.0`). Si usas otra versión pnpm te avisará.

### 1.5 Supabase CLI

```bash
brew install supabase/tap/supabase
supabase --version
```

### 1.6 Docker Desktop (para Supabase local opcional)

```bash
brew install --cask docker
open -a Docker
```

Si solo vas a trabajar contra Supabase Cloud (proyecto dev compartido), Docker no es estrictamente necesario — pero se recomienda para pruebas offline.

### 1.7 VS Code (recomendado)

```bash
brew install --cask visual-studio-code
```

Extensiones sugeridas: `dbaeumer.vscode-eslint`, `esbenp.prettier-vscode`, `bradlc.vscode-tailwindcss`, `Prisma.prisma` (sintaxis SQL).

---

## 2. Clonar el repo

```bash
git clone https://github.com/olivergarciamurillo19/academic-os.git
cd academic-os
```

Cambia a tu rama personal:

```bash
# Óliver
git checkout feat/oliver-frontend

# Armando
git checkout feat/armando-backend
```

---

## 3. Variables de entorno

```bash
cp .env.example .env.local
```

Abre `.env.local` y rellena los valores. Detalle de cada variable en [`ENV_VARS.md`](./ENV_VARS.md). Los secretos del proyecto dev compartido se piden al compañero (nunca se comiten).

Mínimo para correr la app en modo "con datos reales":

- `NEXT_PUBLIC_SUPABASE_URL` (p.ej. `https://xnbkfkalmxalxazqogmu.supabase.co`)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (solo server)
- `OPENAI_API_KEY` (para chat + embeddings)

El middleware detecta ausencia de keys de Supabase y deja pasar sin auth → útil para maquetar UI sin credenciales.

---

## 4. Instalar dependencias

```bash
pnpm install
```

Primer install puede tardar un par de minutos; después Turborepo cachea casi todo.

Si aparece "ENOTFOUND" o similar con `sharp`, `esbuild`, `@sentry/cli`: están whitelisted en `pnpm.onlyBuiltDependencies`, basta con ejecutar `pnpm rebuild`.

---

## 5. Migrar la base de datos

```bash
pnpm db:migrate          # aplica migraciones pendientes vía drizzle-kit
pnpm db:seed             # carga la semilla UAL (universidades + grados + asignaturas)
```

Inspección visual opcional con Drizzle Studio:

```bash
pnpm db:studio           # abre http://local.drizzle.studio
```

---

## 6. Arrancar la app

```bash
pnpm dev
```

Abre http://localhost:3000. Debes ver el login; al autenticarte con magic link caes en `/onboarding` si aún no tienes membership, y en `/dashboard` cuando sí.

Otros comandos útiles:

```bash
pnpm build          # build prod de todas las apps
pnpm lint           # eslint monorepo
pnpm typecheck      # tsc --noEmit monorepo
pnpm test           # tests (cuando existan)
pnpm format         # prettier --write
```

---

## 7. One-command dev (planeado: `./scripts/dev.sh`)

El blueprint (`ACADEMIC_OS.md §13`) contempla `scripts/dev.sh` que arranque en paralelo Supabase local + Next + Inngest dev server. **Aún no existe en el repo**; mientras tanto:

```bash
# Terminal 1 — Next.js
pnpm dev

# Terminal 2 — Inngest dev server (cuando estén definidas las funciones)
npx inngest-cli@latest dev -u http://localhost:3000/api/inngest

# Terminal 3 — Supabase local (solo si trabajas offline)
supabase start
```

Cuando se cree `scripts/dev.sh`, esta sección se reemplaza por `./scripts/dev.sh`.

---

## 8. Troubleshooting

| Síntoma                                    | Arreglo                                                          |
| ------------------------------------------ | ---------------------------------------------------------------- |
| `pnpm: command not found`                  | `corepack enable && corepack prepare pnpm@10 --activate`         |
| Node version mismatch                      | `nvm use` en la raíz (lee `.nvmrc`)                              |
| Turbopack "module not found" tras rebase   | `rm -rf apps/web/.next .turbo && pnpm install`                   |
| Alias `@/` no resuelve en VSCode           | `⇧⌘P → TypeScript: Restart TS Server`                            |
| `pnpm db:migrate` error de conexión        | revisa `DATABASE_URL` / IP permitida en Supabase → Database → Network |
| Error Sentry `SENTRY_AUTH_TOKEN`           | Ignorable en local: el `next.config.mjs` solo activa Sentry con token + org presentes |
| Supabase auth redirige en bucle            | borra cookie `active_cohort_id` en devtools, vuelve a loguear    |

---

## 9. Siguientes pasos

1. Lee `docs/ARCHITECTURE.md` y `docs/DB_SCHEMA.md`.
2. Lee `docs/CONTRIBUTING.md` (ramas, commits, DoD).
3. Elige un issue etiquetado con tu dominio (`frontend` o `backend`) y abre rama desde tu `feat/*`.
