---
name: rivet-build-frontend
description: Use when building or changing a Rivet screen or component. The build process — server-first composition, states, mobile-first sizing — alongside the design system in rivet-ui, which is the visual reference.
---

# Frontend Builder

`rivet-ui` is the design system and the visual spec; load it for tokens, primitives and the
identity. This is how a screen gets built so it does not need fixing afterwards.

## Compose server-first

Server Components by default. `'use client'` only for state, effects or handlers, and pushed as
far down as it goes — a page should not become a client component because one button needs
`onClick`.

```
src/app/app/(shell)/<feature>/
  page.tsx          Server Component — requireSession(), query(), render
  actions.ts        'use server' mutations, Zod-validated
  <feature>-*.tsx   'use client' islands
```

Colocate. A file moves to `src/lib` or `src/components/shared` once a *second* route needs it,
not in anticipation.

The React Compiler is on — do not hand-write `useMemo`/`useCallback` without a measurement.

## Read the role, always

A page that renders company data must know who is looking. `requireSession()` returns `role`;
use it. The dashboard read no role at all and shipped revenue, close rate, pipeline value and
every unpaid invoice to technicians.

**Withhold in the query, not the markup.** A value behind a JSX conditional is still in the HTML
payload.

## Build mobile-first, not mobile-after

Design at 375px and let it grow. This is a standing requirement, not a polish pass — the people
using this are in driveways and at red lights.

- Tap targets ≥ 44px: `h-11`, with `lg:h-9` to shrink on desktop. `h-9` alone is desktop-only.
- Tables do not work on phones. Cards below `md:`, table at `md:` and up.
- Nothing scrolls horizontally.
- Text inputs stay 16px or iOS zooms on focus. Tailwind utilities beat `@layer base`, so check
  the primitive rather than the global stylesheet.
- The primary action stays thumb-reachable.
- A row that wraps badly looks like a bug. Two columns with the third spanning both beats a
  `flex-wrap` that strands one button on its own line.

## Lead with what they came for

Order sections by the question the person opening the screen is asking. Metrics are not the
answer at 7am; today's schedule is. Large empty cards push real content below the fold.

## States are features

Every list needs an empty state (`EmptyState`), a loading state (`Skeleton` or `loading.tsx`)
and an error path. A blank screen where data should be reads as broken software, and a
contractor who thinks the app is broken does not send the quote.

Empty states say what to do next: "No quotes yet — create your first one", not "No results".

## Controls must do something

Never render a control without a handler. Four shipped that way — a search box, a mobile search
icon, a notification bell and a Filter button. A link to a route that does not exist and a
`mailto:` to a domain that does not resolve are the same bug wearing a different hat.

Use `asChild` for a link that looks like a button. `<Link><Button>` renders `<a><button>`, which
is invalid.

## Before you call it done

- Seen at **375px** with touch, in a browser. Not a narrowed desktop window.
- Dark mode checked — tokens handle it, raw palette classes do not.
- No `slate-`, `gray-`, `zinc-`, `blue-` etc. in the diff (`status-badge.tsx` is the one
  exception).
- Icon-only buttons labelled; focus visible; tab order sane.
- `npx tsc --noEmit` clean.

Then hand to `rivet-test-ui`, which assumes you did none of this.
