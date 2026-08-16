---
name: rivet-test-ui
description: Use when asked to test, check or review a Rivet screen visually — "does this look right", "check the UI", "is this mobile friendly", after building any page, or before calling UI work done. Drives a real browser at 375px, finds dead controls, and checks the design-system rules this codebase keeps drifting from.
---

# UI Tester

You are testing what a contractor actually sees, in a browser, at the size they hold. Not
reading the JSX and reasoning about it.

**The rule that generates everything else: a screen is non-compliant until you have seen it at
375px with touch emulation.** Class names are not evidence. `snap-x snap-mandatory` reads as a
deliberate carousel and was one — it also had seven sub-44px controls and hid four of five
stages, and nobody knew because nobody looked.

`rivet-ui` is the spec for building. This skill is for checking, and it assumes the spec was not
followed.

## Setup

```bash
npm run dev                      # must be running
```

Sign in at `/login` with `owner@acme.demo` / `demo1234` (also `office@`, `tech@` — you will need
all three, see the role pass below). Resize to **375 × 812** before navigating, not after.

Routes worth walking, in the order a contractor meets them:

```
/login  /app/onboarding  /app/dashboard  /app/pipeline  /app/pipeline/[id]
/app/quotes/new  /app/calendar  /app/customers  /app/customers/[id]
/app/catalog  /app/analytics  /app/integrations  /app/settings
/q/{token}  /q/{token}/sign  /q/{token}/pay  /i/{token}  /join/{token}
```

The public `/q` and `/i` routes get disproportionate care. A stranger accepts a five-figure
quote there, once, unguided, on a phone.

## Dead controls

Every rendered control must do something. Four were found live in one pass — a global search
box, a mobile search icon, a notification bell and a pipeline Filter button, all with no
handler.

Static sweep first, it is cheap:

```bash
# buttons with no onClick, no type=submit, no asChild, no form
grep -rn '<Button' src --include='*.tsx' -A3 | grep -v 'onClick\|asChild\|type="submit"\|form='
```

It produces false positives (`onMouseDown` pickers, email templates). Confirm in the browser.

Then the ones a scanner cannot see:

- **Links to routes that do not exist.** The sign-in footer linked `/pricing`, `/privacy` and
  `/terms`; all three redirected back to sign-in, so a prospect wanting the terms went in a
  circle. `curl -s -o /dev/null -w "%{http_code}" localhost:3000/<path>` each one.
- **`mailto:` to a domain that does not resolve.** Two buttons pointed at `hello@quotepro.demo`.
  The request went nowhere and the user could not tell.
- **Copy that contradicts the code.** The integrations page said QuickBooks was "Coming soon"
  while a finished, authenticated export sat at `/api/export/[kind]` with no link to it.

A control that silently discards the user's action is worse than no control.

## Mobile

- **Tap targets ≥ 44px.** `h-9` is desktop-only; `h-11` is the phone default, `lg:h-9` to shrink.
- **Nothing scrolls horizontally.** Check the page body, and check tables and code blocks.
- **Tables become cards below `md:`.** Five numeric columns do not fit 375px.
- **iOS zoom.** Text inputs need 16px. Tailwind utilities beat `@layer base`, so a `text-sm` on
  the `Input` primitive re-breaks this — check the primitive, not the global.
- **The primary action stays thumb-reachable.**

## Information order

Ask what the person opening this screen came to do, then check the screen leads with it.

The dashboard put four KPI tiles above the work, so close rate occupied the first phone screen
and today's schedule started around the third — for a product opened at 7am in a truck. It was
a work queue with the work in third place.

Sections that are large and empty push real content below the fold. An empty promotions card
took a third of the screen before a single price appeared.

## Design system

```bash
# raw palette classes — forbidden outside status-badge.tsx
grep -rEn '(bg|text|border|from|to|via)-(slate|gray|zinc|neutral|stone|red|blue|green|yellow|indigo|purple|pink)-[0-9]{2,3}' src --include='*.tsx' | grep -v status-badge
```

These do not follow the theme. A fixed `from-gray-50 to-gray-100` left the customer's *signing*
screen white while the rest of the app went dark. **Check dark mode explicitly** — the tokens
handle it, hardcoded palettes do not.

## Roles

Sign in as `tech@acme.demo` and walk the same screens. A technician must not see revenue, close
rate, pipeline value, unpaid invoices, or catalog prices. The dashboard shipped all of those to
technicians because it read no role at all while two other screens gated the same numbers.

Withholding must happen in the **query**. A conditional in JSX still ships the data to the
browser, where it is readable in devtools.

## Accessibility — audit against WCAG 2.2 AA

`rivet-ui` carries the full standard. Test it in this order, because automated tooling catches
roughly a third and the rest needs hands.

**1. Automated sweep** — cheap, run it first, believe the failures and not the passes.

```bash
npx @axe-core/cli http://localhost:3000/app/dashboard
```

**2. Keyboard only.** Unplug the mouse. Tab the whole screen. Anything you cannot reach or
operate fails 2.1.1 whatever axe reported. Watch for focus disappearing behind the sticky top bar
or the sticky action bar — that is 2.4.11 Focus Not Obscured, new in 2.2, and Rivet has both bars.

**3. The 2.2 additions**, which older checklists and older tooling miss:

- **2.5.7 Dragging Movements (AA).** Anything done by dragging needs a non-drag single-pointer
  path. **Known failure: rescheduling a job is drag-only** — `rescheduleJob` is reachable from
  the drag handlers in `calendar-board.tsx` and `week-grid.tsx` and nowhere else, and the job
  dialog has no date or time control. Re-check this before reporting it fixed.
- **2.5.8 Target Size** 24×24 minimum — the 44px house rule clears it.
- **3.3.7 Redundant Entry** — is anything asked twice in one flow?
- **3.3.8 Accessible Authentication** — paste must work on the password field, and
  `autoComplete` must be accurate or password managers break.
- **3.2.6 Consistent Help** — help and contact stay in the same relative position.

**4. Structure and naming**

- `aria-label` on every icon-only button.
- Semantic elements — a `div` with `onClick` is not a button.
- No nested interactive content. `<Link><Button>` renders `<a><button>`, which is invalid; use
  `asChild`.
- Contrast ≥ 4.5:1 text, 3:1 for UI components and focus rings. `text-muted-foreground` on
  `bg-muted` is the pairing that fails here.
- Errors are identified in text and say how to fix them; a red border is not a message.

**5. Zoom and reflow** — 200% zoom without losing content, reflow at 320px.

Do not report **4.1.1 Parsing**. It was removed in WCAG 2.2.

## Reporting

Separate **verified by looking** from **inferred from code**, every time. Say which screens you
did not reach and why. A finding without a screenshot or a command output is a hypothesis.

Fix what is objectively broken. Surface what needs a product decision — do not delete a screen
or restructure information architecture on your own judgement.
