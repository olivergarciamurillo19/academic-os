# ADR 004 — Next.js 15 (App Router) como framework de frontend

- **Título:** Adoptar Next.js 15 con App Router, React 19, Server Components + Server Actions, typed routes y Turbopack.
- **Status:** Accepted
- **Fecha:** 2026-04-20
- **Deciders:** Óliver, Armando

---

## Contexto

La app web es una PWA que necesita:

- **SSR / streaming** para percepción de velocidad en 4G (estudiantes en campus).
- **Auth middleware** que corra antes del render.
- **Route handlers** para `/api/ai`, `/api/inngest`, `/api/auth/confirm`, etc.
- **Uploads** de PDFs con server-side processing (encolando en Inngest).
- **Integración Sentry + Vercel Analytics + PostHog** sin friction.
- **Deploy** trivial (dos fundadores, cero tiempo para mantener Kubernetes).

React 19 estabilizó Server Components y Actions. Next.js 15 fue el primer release con ambos productionizados, `typedRoutes` estable y Turbopack en dev.

## Decisión

Adoptar **Next.js 15 (App Router)** como el único framework de la app `@academic-os/web`.

Confirmado en `apps/web/package.json`:

- `next: ^15.1.3`
- `react: ^19.0.0`, `react-dom: ^19.0.0`
- `@sentry/nextjs: ^8.47.0` (integración oficial)
- `next dev --turbopack` en el script `dev` del paquete
- `typedRoutes: true`, `transpilePackages`, `experimental.serverActions.bodySizeLimit: "2mb"` en `next.config.mjs`

Patrones adoptados:

- **Server Components** por defecto. `"use client"` solo en componentes que necesitan estado/efectos del browser.
- **Server Actions** (`"use server"`) reemplazan la mayoría de endpoints `/api/*` para mutaciones desde la UI.
- **Route Handlers** bajo `src/app/api/**` para webhooks (Inngest, Supabase auth callback) y streaming de chat.
- **Middleware** (`src/middleware.ts`) con `@supabase/ssr` — gate de auth + tenant cookie.
- **Typed routes** — navegación `router.push('/dashboard')` validada por TS; PR lint si rompes un href.

## Consecuencias

### Positivas

- **Streaming SSR real** con `<Suspense>`: dashboard muestra esqueleto inmediato, data llega por streaming. TTFB bajo.
- **Server Actions** eliminan mucho API boilerplate: la server action vive al lado del componente que la usa, el form la llama directamente, Next.js genera el endpoint interno y el error-boundary UI se cablea solo.
- **Typed routes** atrapa broken links en CI antes de que se escape a prod.
- **Turbopack en dev**: reloads < 300 ms en el monorepo incluso con los packages transpilados.
- **Sentry oficial**: `withSentryConfig` en `next.config.mjs` envuelve el build y sube source maps si hay credenciales, se inhibe si no — no rompe dev local sin secretos.
- **Vercel-first**: deploy preview automático en cada PR, sin config extra más allá del `NEXT_PUBLIC_*` en el dashboard.
- **App Router se alinea con el futuro de React** (Components como default server, Actions, resource hooks). Baja apuesta de ser deprecado.

### Negativas

- **Breaking change desde Pages Router** — si viniéramos de Pages habría que migrar. No es el caso, arrancamos en App Router.
- **React 19 + App Router todavía con aristas**: algunos libs esperan React 18; revisar `@radix-ui` y `@dnd-kit` en cada bump.
- **Curva de Server Components**: error típico es intentar pasar funciones o fechas no serializables entre server y client. Hay que conocer la línea.
- **Server Actions ≠ API pública**: si un día otra app (mobile, extension) consume lógica, hay que promover el action a `api/` explícito. Mitigado: empezar con `api/` cuando ya se prevé consumidor externo (Inngest, webhooks).
- **Turbopack** aún tiene bugs esporádicos en edge cases (`rm -rf .next .turbo` sigue siendo nuestro amigo).

### Neutras

- **Acoplamiento a Vercel** moderado: self-host de Next 15 es posible (Docker / Node) pero no es donde Vercel optimiza. No es una jaula dorada pero sí un camino preferido.

## Alternativas consideradas

| Alternativa                  | Por qué no                                                                                          |
| ---------------------------- | --------------------------------------------------------------------------------------------------- |
| **Next.js 14 (Pages Router)** | Camino a deprecación. Perderíamos Server Actions y streaming moderno.                              |
| **Remix v2 (antes de unirse con React Router 7)** | Gran DX, pero hosting fuera de Vercel es más manual y la comunidad ahora más fragmentada. |
| **SvelteKit**                | Excelente pero cambia stack (React → Svelte). Ecosistema shadcn/Radix no existe equivalente maduro; perderíamos el UI kit. |
| **Astro + islands**          | Mejor para sites content-heavy que para app interactiva con auth + chat en vivo.                    |
| **Vite + React SPA + API propio** | Habría que mantener cliente + server + bundler + framework de routing aparte. Cero ventaja.     |

## Revisión

Se revisa si:

- Next.js 16 rompe compatibilidad crítica y migrar no es trivial.
- Turbopack acumula regressions que afectan nuestro dev loop más de lo que ahorra.
- Vercel cambia pricing de forma inasumible y hay que self-hostar → evaluar OpenNext / Node standalone output.
