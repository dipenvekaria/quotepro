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

## Accessibility — WCAG 2.2 Level AA

**Target: WCAG 2.2 AA.** 2.2 is the current W3C Recommendation; 3.0 is a working draft and not a
standard to build against. AA is also the level US ADA web claims are argued at, and those are a
live litigation area — see `docs/GTM_BUSINESS_CHECKLIST.md` §4.3.f.

### Carried over from 2.1, and non-negotiable

- **1.4.3 Contrast** ≥ 4.5:1 for text, 3:1 for large text and UI components.
  `text-muted-foreground` on `bg-muted` is the pairing that fails here.
- **1.4.11 Non-text Contrast** — borders, focus rings and icons that carry meaning need 3:1.
- **2.1.1 Keyboard** — everything reachable and operable, no traps.
- **2.4.7 Focus Visible** — `:focus-visible` is styled globally; do not remove it.
- **4.1.2 Name, Role, Value** — `aria-label` on every icon-only button; a `div` with `onClick`
  is not a button.
- **1.3.1 Info and Relationships** — real headings, real lists, real labels tied to inputs.
- **3.3.1 / 3.3.3 Errors** — identify the error in text and say how to fix it. A red border is
  not an error message.

### New in 2.2 — the ones that actually bite this product

- **2.5.7 Dragging Movements (AA).** Anything achievable by dragging needs a single-pointer
  alternative that is not dragging. Rivet failed this — rescheduling was drag-only — and now
  satisfies it: the job dialog carries a `datetime-local` field and a Move button, sharing one
  `applyReschedule` path with the drag handler. Native controls on purpose, so the platform's own
  picker and keyboard behaviour come for free. **Any new drag interaction needs the same
  treatment.**
- **2.5.8 Target Size (Minimum) (AA)** — 24×24 CSS px. The house rule of 44px already clears it
  comfortably; keep using `h-11`.
- **3.2.6 Consistent Help (A)** — if help or contact exists, it stays in the same relative place
  across pages.
- **3.3.7 Redundant Entry (A)** — do not ask for information already given in the same process.
  The invite flow prefills and locks the invited address for exactly this reason.
- **3.3.8 Accessible Authentication (Minimum) (AA)** — no cognitive function test without an
  alternative. **Never block paste on a password field**, and keep `autoComplete` accurate
  (`current-password` / `new-password`) so password managers work. Currently satisfied — do not
  regress it.
- **2.4.11 Focus Not Obscured (Minimum) (AA)** — a focused element must not be completely hidden
  by sticky headers, bottom bars or toasts. Rivet has a sticky top bar and a sticky action bar,
  so check keyboard focus at 375px where they are closest together.

4.1.1 Parsing was **removed** in 2.2. Do not report it.

### Beyond WCAG

- **Reduced motion** — honour `prefers-reduced-motion` on anything that animates.
- **Zoom to 200%** without loss of content or function (1.4.4), and reflow at 320px CSS width
  (1.4.10).
- **Language** — `<html lang>` set.
- **Autofill** — correct `autocomplete` tokens on name, email, tel, address (1.3.5). Contractors
  fill these on a phone.

### Checking it

Automated tools catch perhaps a third. Keyboard-only and a screen reader catch the rest.

```bash
npx @axe-core/cli http://localhost:3000/app/dashboard   # or the axe devtools extension
```

Tab through the whole screen. If you cannot reach or operate something, it fails, whatever axe
says.

<!-- superseded section retained below for the specifics it names -->
## Accessibility (detail)

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

## Every screen knows who is looking

A page rendering company data must read `role` from `requireSession()` and use it. The dashboard
did not, and shipped revenue, close rate, pipeline value and every unpaid invoice to technicians
— on the page everyone lands on after signing in, while `/app/analytics` gated the same figures.

Withhold in the **query**, not the markup: a value behind a JSX conditional still ships to the
browser. See the roles table in `rivet-data`.

## Controls must do something

Never render a control without a handler. Four shipped that way — a global search box, a mobile
search icon, a notification bell and a pipeline Filter button.

The same bug wears other hats, and a scanner misses all of them:

- A link to a route that does not exist. The sign-in footer linked `/pricing`, `/privacy` and
  `/terms`; all three redirected back to sign-in.
- A `mailto:` to a domain that does not resolve — two buttons pointed at `hello@quotepro.demo`.
- Copy that contradicts the code: the integrations page said QuickBooks was "Coming soon" while
  a finished, authenticated export sat behind no link.

A control that silently discards the user's action is worse than no control.

Use `asChild` for a link styled as a button — `<Link><Button>` renders `<a><button>`, which is
invalid nested-interactive HTML.
