# Performance playbook — Academic OS

> Targets Core Web Vitals: LCP < 2.5s · CLS < 0.1 · INP < 200ms · FID < 100ms.

## 1. Bundle analysis

```bash
# One-off analysis (opens report in browser):
ANALYZE=1 pnpm --filter @academic-os/web build
```

Wire by adding `@next/bundle-analyzer` to `apps/web/package.json` and
swapping the export in `next.config.mjs`:

```js
import bundleAnalyzer from "@next/bundle-analyzer";
const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === "true" });
export default withBundleAnalyzer(sentryConfigured ? withSentryConfig(nextConfig, ...) : nextConfig);
```

Expected top-3 heavy packages in first-load: `@sentry/nextjs`,
`react-markdown` + `remark-gfm`, `@dnd-kit/core`. Mitigations:

| Package | Strategy |
|---------|----------|
| `@sentry/nextjs` | Already tree-shaken by `withSentryConfig`. Avoid importing Sentry from client components outside the error boundary. |
| `react-markdown` | Dynamic `import()` inside `MessageBubble` — only loaded when the chat opens. |
| `@dnd-kit/core` | Dynamic import inside the Kanban page (`/tasks`). |
| `lucide-react` | Tree-shakes per icon when imported with named imports; avoid `import * as Icons`. |

## 2. Dynamic imports — checklist

- `features/chat/message-bubble.tsx` → `dynamic(() => import("react-markdown"), { ssr: false })`.
- `features/tasks/kanban-board.tsx` → dynamic `@dnd-kit/*`.
- `features/analytics/posthog-provider.tsx` → defer init until idle or first
  interaction; never block LCP.
- `features/pwa/*` → client-only; already safe.

## 3. Images

- Todos los `<img>` deben migrar a `next/image` salvo assets puramente
  decorativos inline <= 2 KB.
- Avatares: `next/image` con `placeholder="blur"` y `blurDataURL` generado
  en build.
- Listas largas (materiales, anuncios): `priority` solo en los 2 primeros;
  el resto `loading="lazy"`.

## 4. Drizzle queries

- Prohibido N+1. Regla: si el render necesita `N` subrelaciones, usar un
  único `SELECT ... JOIN` o agrupar con `sql.raw` + `Promise.all`.
- Límite por defecto 100 filas en cualquier `select()` sin paginación
  explícita.
- Índices críticos (ver `docs/DB_SCHEMA.md §5`):
  - `idx_tasks_user_status_due` — dashboard "próximas tareas".
  - `idx_events_owner_starts` — calendario.
  - `idx_chunks_subject_document_index` — retrieval RAG.
- Revisar con `EXPLAIN (ANALYZE, BUFFERS)` antes de shippear cualquier
  query nueva en hot path.

## 5. Streaming & Suspense

- Dashboard y páginas de subject: Server Components paralelos con
  `Promise.all([...])` y `<Suspense>` por sección.
- Skeletons consistentes en `apps/web/src/components/ui/skeleton.tsx`.
  Reutilizar por sección para evitar CLS.

## 6. Measuring

- PostHog Web Vitals (`posthog.capture("$web_vitals", ...)`) — habilitado
  automáticamente por el proveedor.
- Vercel Analytics opcional via `@vercel/analytics`.
- Sentry Performance traces al 10% en producción (`tracesSampleRate: 0.1`).

## 7. Checklist por PR que toque UI

- [ ] Ningún `import * as` de paquetes con > 20 KB.
- [ ] `next/image` para toda imagen con dimensiones conocidas.
- [ ] Server Component salvo que use estado/eventos.
- [ ] `<Suspense>` envolviendo fetchs no críticos.
- [ ] `EXPLAIN ANALYZE` para queries nuevas en rutas de render.
