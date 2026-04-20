# ADR 002 — Calendar library choice

- **Status:** Accepted
- **Date:** 2026-04-20
- **Deciders:** Óliver (frontend)
- **Scope:** V1 calendar view (`/calendar` and `/subjects/[id]/calendar`)

## Context

Academic OS V1 needs a calendar surface that shows classes, exams and
deliveries for the 10 UAL first-year subjects. In V1 the data is a
frontend mock; in V2 it will merge iCal UAL feed, Google Calendar and
Blackboard-extension events. The product requirements are:

- **Desktop**: month grid as the default view.
- **Mobile**: agenda (list) as the default view.
- **Day view**: optional.
- **Filtering**: toggle which asignaturas are visible, each with its
  theme color.
- **Create/Edit**: modal form (React Hook Form + Zod) — título,
  inicio, fin, asignatura, lugar, tipo, descripción.
- **DnD (desktop)**: drag to move manually-created events.
- **Source coloring**: different accent for manual / iCal / Google /
  Blackboard events (to make sync provenance obvious to the user).

## Options considered

### A. `@fullcalendar/react`

**Pros**
- Battle-tested, rich feature set (resource timeline, recurrence, TZ).
- Built-in DnD (`@fullcalendar/interaction`).
- Month / week / day / list views out of the box.

**Cons**
- Bundle size: ~270 KB minified for core + day-grid + list + interaction
  plugins — heaviest of the three options.
- Licensing: FullCalendar v6 core is MIT, but several common premium
  plugins (resource, timeline) require a commercial license. We do not
  need them today, but the split is a tripwire.
- Styling is opinionated; overriding to Tailwind v4 tokens requires
  CSS variable shimming and can conflict with shadcn/ui primitives.
- React 19 support is declared but still requires adapter work around
  Server Components (the component is strictly client-side).

### B. `react-big-calendar`

**Pros**
- MIT, no premium tier.
- ~80 KB + one date adapter (date-fns / moment / luxon).
- Month + agenda views are native and map cleanly to our requirements.
- DnD via `react-big-calendar/lib/addons/dragAndDrop` (pulls in
  `react-dnd` + HTML5 backend).

**Cons**
- CSS is pre-built and hostile to Tailwind theming; we would ship
  `react-big-calendar/lib/css/react-big-calendar.css` and override
  with selectors (brittle under Tailwind v4).
- The DnD add-on bumps bundle ~35 KB (react-dnd).
- API surface is dated; the maintainer cadence is slow.

### C. Custom lightweight calendar (chosen)

Build a minimal calendar with:
- Native `Date` + `date-fns` for start-of-week / add-days / format.
- CSS Grid for month view.
- Flat list for agenda.
- shadcn/ui Dialog + Button + Input + Textarea + Select for the
  create/edit form.
- Source and subject color tokens (`--color-subject-*`) already in the
  theme preset.

**Pros**
- Zero third-party calendar code — the bundle adds only `date-fns`.
- Styling is Tailwind-native; dark mode and subject tokens work
  without CSS shims.
- The component shape is ours; swapping in RBC later is a localized
  refactor (one component).
- Keeps us honest about V1 scope: the only real calendar logic today
  is a month grid and a list. Library features we do not need (week,
  timeline, recurrence edit modal, TZ-aware drag) would be premature.

**Cons**
- We write the month-grid math ourselves.
- DnD is deferred to V2 (when real events exist and DnD is meaningful;
  moving a mocked row has no behaviour to exercise).
- Recurring events, overlap stacking and time-grid week view must be
  built by hand when we need them.

## Decision

**Go with C (custom).** It delivers the V1 requirements with the
smallest bundle and cleanest Tailwind integration, and keeps our
options open. When the real sync stack lands (post-V1, post-Armando's
`event_source` schema), revisit the choice:

> If by Fase 3 we need week-time-grid, recurrence editing or multi-TZ
> conflict resolution, migrate to `react-big-calendar` behind the same
> `CalendarView` interface. Do not migrate before then.

## Consequences

- Deferred: DnD, week grid, recurrence. Tracked by an `adr-followup`
  label on the issue that opens the Fase-3 calendar work.
- The custom view consumes a small adapter module
  (`features/calendar/event-source.ts`) that maps backend event rows
  to the UI model, isolating a future library swap.
- Adds `date-fns` and `react-hook-form` + `@hookform/resolvers` as
  first-class deps.
