# Design System

> **Populated in Phase 5.** Placeholder for Phase 0.

## Principles

- **Mobile-first** — every layout starts at 360px.
- **Content-first** — chrome shrinks so content grows.
- **Trustworthy** — public quote viewer should feel like Stripe checkout.
- **Fast** — Lighthouse mobile ≥95 on all critical routes.

## Tokens

Declared as CSS custom properties in `src/styles/globals.css` with light + dark values.

### Colors

_TBD — brand primary/secondary, semantic (success/warning/danger/info), 12 neutral shades._

### Typography

- Two-font-family limit.
- Display, heading, body, mono roles.

### Spacing

- 4/8 base scale: 4, 8, 12, 16, 24, 32, 48, 64, 96.

### Radii

- sm (4), md (8), lg (12), xl (16), full.

### Shadows

- card, popover, modal, elevated.

### Motion

- Standard easing curves + durations 150/250/400ms.
- `prefers-reduced-motion` respected everywhere.

## Component Anatomy

_TBD — Storybook remains the authoritative UI docs._

## Accessibility

- WCAG AA everywhere.
- ARIA labels on icon-only buttons.
- Keyboard nav for all interactive elements.
- Visible focus rings.
- Screen-reader tested with VoiceOver + NVDA.
- Contrast ratio ≥4.5:1.
