---
name: rivet-ui
description: Use when building or changing any Rivet interface — a new page, a component, layout, styling, or the public quote/invoice viewer. Covers the monochrome design system, the shared page primitives, mobile-first constraints, and what "best in class" means for this product specifically.
---

# Rivet UI

## The identity

Rivet is **monochrome**. Near-black ink on white, one soft warm-gray neutral ramp, and colour
reserved almost entirely for status and destructive actions.

That's a deliberate position. Every field-service SaaS on the market is orange, blue, and busy.
Restraint reads as expensive, and the product's job — showing a contractor exactly what they're
owed and what's happening today — is better served by clarity than by decoration. If a screen
needs colour to be legible, the hierarchy is wrong.

Reference points: Stripe, Attio, Linear. Dense, calm, generous whitespace, tabular numbers,
type doing the work that colour usually does.

`/brand` renders the living design kit. Open it before designing anything new.

## Tokens

`src/app/globals.css` defines everything, in oklch, with light and dark values.

```
bg-background text-foreground        page
bg-card       text-card-foreground   surfaces
bg-muted      text-muted-foreground  secondary content
bg-primary    text-primary-foreground  the ink accent — near-black light, white dark
border-border                        every line
bg-destructive                       only for destructive actions
```

**Never use a raw Tailwind palette class** — `bg-slate-100`, `text-gray-500`, `bg-blue-600`.
They don't follow the theme and they break the identity. The one sanctioned exception is the
status badge palette in `src/components/shared/status-badge.tsx`, where a fixed hue per
lifecycle state carries real meaning.

Radii: `rounded-lg` for controls, `rounded-xl` for surfaces. Shadows: `shadow-sm` on surfaces,
`shadow-card` for elevated. Nothing heavier.

## Page scaffolding

Three primitives from `@/components/shared/page` give every screen the same rhythm. Use them
rather than hand-rolling `mx-auto max-w-… rounded-xl border bg-card`, which is how the old UI
drifted.

```tsx
import { PageContainer, PageHeader, Section } from '@/components/shared/page'

export default async function Page() {
  const { companyId } = await requireSession()
  const rows = await query(/* … */)

  return (
    <PageContainer>
      <PageHeader
        title="Pipeline"
        description="Every lead, quote, and job in one place."
        actions={<Button asChild><Link href="/app/quotes/new">New quote</Link></Button>}
      />
      <Section title="Quotes" className="mt-6" flush>
        {/* table */}
      </Section>
    </PageContainer>
  )
}
```

`PageContainer` fixes one max width (1360px) and the responsive padding. `PageHeader` handles
eyebrow/title/description/actions. `Section` is *the* card primitive — `flush` drops body
padding for tables and full-bleed lists.

## Components

`src/components/ui/` has 19 shadcn primitives: button, card, input, label, select, checkbox,
switch, tabs, dialog, alert-dialog, dropdown-menu, avatar, badge, progress, skeleton, textarea,
alert, sonner, action-button.

Use them. A hand-rolled button that looks 95% right is worse than the one that exists, because
the 5% is focus rings, disabled states, and keyboard behaviour.

`src/components/shared/`: `StatusBadge` (every `work_item_status`), `EmptyState`, and the page
primitives above.

Ignore `src/components/{features,queues,navigation,calendar,ai}/` entirely — dead pre-rebuild
code. See `docs/CODEBASE_MAP.md`.

## Server first

Server Components by default. `'use client'` only for state, effects, or handlers, and push it
as far down as it goes — a page shouldn't become a client component because one button needs
`onClick`.

The React Compiler is on. Don't hand-write `useMemo`/`useCallback` without a measurement.

## Mobile is the primary surface

A technician uses this standing in someone's driveway. A contractor reviews a quote at a red
light. Design at 375px first and let it grow.

`globals.css` already handles the things people forget: 16px form fields so iOS doesn't
auto-zoom on focus, 14px base body text on mobile stepping up at `sm:`, headings that scale
down, `overflow-x: hidden` on `html`/`body`, and `-webkit-tap-highlight-color: transparent`.

Beyond that:

- Tap targets ≥ 44px. `h-9` is a desktop-only size.
- Tables don't work on phones. Cards below `md:`, table at `md:` and up.
- The app shell already has a mobile drawer and top bar — don't build another nav.
- Primary action stays reachable with a thumb.
- Test at 375px. Not a narrow desktop window — the device toolbar, with touch.

## Numbers

Money and counts are the product. `font-variant-numeric: tabular-nums` is already applied to
tables and anything marked `.tabular` or `[data-tabular]` — use those so columns align.

Format money consistently. A quote total is `$4,250.00`, never `$4250` and never `4,250.00 USD`.

## States are features, not polish

Every list has an empty state (`EmptyState`), a loading state (`Skeleton` or `loading.tsx`), and
an error path. A blank screen where data should be reads as broken software, and a contractor
who thinks the app is broken doesn't send the quote.

Empty states should say what to do next, not just that there's nothing there. "No quotes yet —
create your first one" beats "No results."

## Accessibility

WCAG AA. Non-negotiable parts:

- `aria-label` on every icon-only button. The app shell has several that need auditing.
- Visible focus. `:focus-visible` is styled globally — don't remove it.
- Keyboard reachable, in a sensible order.
- Contrast ≥ 4.5:1. `text-muted-foreground` on `bg-muted` is the combination that fails — check it.
- Semantic elements. A `div` with `onClick` is not a button.

## The public viewer is the product's front door

`/q/{token}` and `/i/{token}` are what the customer sees, often the only thing they see. It has
to feel as safe as Stripe Checkout — a stranger is about to accept a five-figure quote from a
contractor they met once.

- Loads fast, works on any phone, no login.
- Company name and logo prominent. Trust comes from the contractor's brand, not Rivet's.
- Pricing legible at a glance; line items scannable.
- One obvious primary action. Accept. Nothing competing with it.
- No dead ends — every terminal state says what happens next.

Spend disproportionate care here. Internal screens can be dense and learnable; this one gets a
single unguided attempt from someone who will never see it again.

## Before you're done

- No raw palette classes — grep the diff for `slate-`, `gray-`, `zinc-`, `blue-`.
- Renders at 375px without horizontal scroll.
- Empty, loading, and error states exist.
- Icon-only buttons are labelled; focus is visible; tab order is sane.
- Works in dark mode — the tokens handle it, but check.
- `npx tsc --noEmit` is clean.
