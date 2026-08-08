# ADR 0004: The Product Is Called Rivet

**Status**: Accepted
**Date**: 2026-08-07
**Deciders**: @dipenvekaria

## Context

The project began as "QuotePro" — a descriptive name that says what the first feature does. As
the product grew past quoting into the full lead → quote → job → invoice → payment lifecycle,
the name stopped describing it, and "QuotePro" is close to unregistrable: several products in
adjacent markets use it or something within one letter of it.

A branding pass in early August 2026 (commits `ba6e911`…`87aceae`) introduced **Rivet**: a
monochrome black-and-white identity with a mark of a plate fastened by two rivets. It landed in
`src/components/brand/logo.tsx` (`BRAND_NAME = 'Rivet'`), the design tokens, the app shell, and
the public pages.

That left the codebase in an inconsistent state. The running product said Rivet; the repo,
package name, README, and every document said QuotePro.

## Decision

**Rivet is the product name.** Everything user-facing, and everything written from 2026-08-07
onward, uses it.

The name fits the market: rivets are what the trades actually work with, it reads as sturdy and
permanent rather than clever, it's short enough for a domain and an app icon, and it carries no
implication about which feature the product leads with — which matters, because quoting is the
wedge, not the ceiling.

Renamed in this pass:

- `package.json` `name` → `rivet`
- `README.md` and all canonical docs under `docs/`
- `CLAUDE.md` and the `.claude/skills/rivet-*` project skills

Deliberately not renamed yet:

- The repository directory and GitHub remote (`dipenvekaria/quotepro`) — a rename breaks clones
  and CI wiring for no benefit before launch.
- Historical documents (`REBUILD.md`, `docs/archive/`, `docs/rebuild/`) — they are records of
  what was decided at the time.
- `supabase/seed.sql` and migration comments — cosmetic, and touching applied migrations is a
  worse idea than an inconsistent comment.

## Consequences

**Positive**
- The product, the code, and the documentation agree. New contributors stop asking which name is
  real.
- The production domain decision is unblocked.

**Negative**
- A transition period where `quotepro` appears in paths and git remotes while the product says
  Rivet. Mitigated by stating it plainly at the top of `CLAUDE.md`.
- Trademark clearance for "Rivet" has not been done. Required before launch spend.

**Neutral**
- The repository rename can happen at any point; GitHub redirects the old URL.

## Follow-up

- Trademark and domain availability check — blocking for launch marketing.
- Rename the GitHub repository once the production domain is registered.
- Purge `field-genie-logo.tsx`, `logo-options.tsx`, and `thefieldgenie.png` — artefacts of an
  even earlier name.
