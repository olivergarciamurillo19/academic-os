# Academic OS

[![CI](https://github.com/olivergarciamurillo19/academic-os/actions/workflows/ci.yml/badge.svg)](https://github.com/olivergarciamurillo19/academic-os/actions/workflows/ci.yml)
[![DB check](https://github.com/olivergarciamurillo19/academic-os/actions/workflows/db-check.yml/badge.svg)](https://github.com/olivergarciamurillo19/academic-os/actions/workflows/db-check.yml)

Sistema operativo académico para estudiantes. Next.js 15 · TypeScript · Supabase · Drizzle · Tailwind v4 · shadcn/ui.

El blueprint de producto y arquitectura vive en [`ACADEMIC_OS.md`](./ACADEMIC_OS.md).

---

## Setup rápido (macOS)

### 1. Requisitos

```bash
# Homebrew (https://brew.sh)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Node 20 (via nvm, recomendado)
brew install nvm
mkdir -p ~/.nvm
# Añade a ~/.zshrc:
#   export NVM_DIR="$HOME/.nvm"
#   [ -s "/opt/homebrew/opt/nvm/nvm.sh" ] && \. "/opt/homebrew/opt/nvm/nvm.sh"
nvm install 20
nvm use 20

# pnpm 9+
corepack enable
corepack prepare pnpm@latest --activate

# Git + Docker Desktop
brew install git
brew install --cask docker
```

> `nvm use` leerá el `.nvmrc` del repo (Node 20).

### 2. Clonar y arrancar

```bash
git clone https://github.com/olivergarciamurillo19/academic-os.git
cd academic-os
cp .env.example .env.local   # rellena los secretos cuando estén disponibles
pnpm install
pnpm dev
```

Abre [http://localhost:3000](http://localhost:3000). Debe verse el placeholder **"Academic OS"**.

### 3. Comandos principales

```bash
pnpm dev          # next dev en apps/web (Turbopack)
pnpm build        # build de todas las apps
pnpm lint         # ESLint en todo el workspace
pnpm typecheck    # tsc --noEmit en todo el workspace
pnpm test         # tests (cuando existan)
pnpm format       # Prettier --write
```

Con Turborepo, los comandos reutilizan la caché local y remota automáticamente.

---

## Estructura del monorepo

```
academic-os/
├── apps/
│   └── web/                    # Next.js 15 (App Router)
├── packages/
│   ├── config-ts/              # tsconfig compartido (base, next, react-lib)
│   ├── config-eslint/          # ESLint flat config + typescript-eslint
│   └── config-tailwind/        # Tailwind v4 preset CSS-first
├── docs/                       # Documentación viva
├── turbo.json
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

Detalle completo en [`ACADEMIC_OS.md §13`](./ACADEMIC_OS.md#13--repository-structure).

---

## Workflow de branches

- `main` → protegida, solo merges vía PR aprobado con CI en verde.
- `feat/oliver-frontend` → trabajo frontend de Óliver.
- `feat/armando-backend` → trabajo backend de Armando.

Reglas:

1. Nunca commit directo a `main`.
2. Antes de empezar una tarea: `git pull origin <rama-del-otro>` para sincronizar.
3. Commits en formato [Conventional Commits](https://www.conventionalcommits.org/):
   `feat(scope): descripción`, `fix(scope): …`, `chore(scope): …`.
4. PR title idéntico al commit principal. Descripción corta con qué/por qué/cómo probar.

---

## Troubleshooting rápido

| Problema                                  | Solución                                              |
| ----------------------------------------- | ----------------------------------------------------- |
| `pnpm: command not found`                 | `corepack enable && corepack prepare pnpm@latest -a`  |
| Node version mismatch                     | `nvm use` en la raíz del repo                         |
| TypeScript no encuentra aliases `@/…`     | Reinicia TS server en VSCode (`⇧⌘P → TypeScript: Restart TS Server`) |
| Turbopack falla en `pnpm dev`             | `rm -rf apps/web/.next .turbo && pnpm install`         |

---

## Licencia

UNLICENSED · uso interno hasta V1 pública.
