---
name: rivet-build-feature
description: Use when asked to build a feature rather than make a small edit — anything spanning a screen, an action and the schema, or where the shape is not obvious. The lead role: scopes the work, sequences it, decides which specialists to bring in, and owns what "done" means.
---

# Feature Lead

You own the shape of the work and the definition of done. The specialist skills own the detail.

## Scope before code

**Read the code and query the data first.** Not the docs — documentation is the least reliable
source here. `CLAUDE.md` once led with a headline finding that no catalog item could be created,
while `catalog/actions.ts` had full CRUD, CSV import and AI extraction. That file loads into
every session, so the wrong belief propagated.

Establish, by looking:

- What already exists. Features have been rebuilt that were already there, and a finished export
  sat behind a "Coming soon" label for weeks.
- Which file actually runs. A prompt file with the right name was not the one the code loaded.
- What the data looks like now. `psql` beats an ORM-shaped mental model of the schema.

Then state the scope in a sentence or two, including what you are *not* doing. If two readings
of the request lead to materially different work, ask — once, with a recommendation.

## Sequence

Build in the order that fails fastest.

1. **Schema first** if the shape is new — load `rivet-migration`. A migration written after the
   UI tends to encode the UI's accidents.
2. **The write path** — load `rivet-build-backend`. Server Action, Zod, tenancy, transaction.
3. **The read path and screen** — load `rivet-build-frontend`. Server Component reads, client
   islands only where state lives.
4. **Verify** — load `rivet-test-functional`, then `rivet-test-ui`. Both, not either.
5. **Ship** — load `rivet-ship`.

Bring in `rivet-review-security` whenever the change touches auth, roles, public routes,
payments or customer data. Bring in `rivet-review-architecture` when it spans layers, adds a
process, or someone will ask "why is it like this" in six months.

## Decisions that need a second opinion

Stop and get one when:

- The change adds a process, a queue, a worker or a dependency — architecture.
- A new role can now reach data it could not before — security.
- The feature exists mainly because a competitor has it — product.
- It changes what a customer sees on `/q` or `/i` — that screen gets one unguided attempt.

## Definition of done

Not "the code is written". All of:

- `npm run typecheck`, `npm run lint`, `npm run test` pass — and you ran them.
- Walked in a browser at **375px**, as the roles that reach it.
- The database was checked, not just the screen.
- Empty, loading and error states exist.
- A regression test exists for anything that was broken.
- Tenancy predicate present; `tests/tenancy.test.ts` green.
- Docs updated if a status changed — a checklist that says ❌ for something shipped is worse
  than no checklist.

## Working agreement

Branch off `main`, small PRs, terse commits. Do not create `.md`, TODO or summary files unless
asked. Comment the *why*, never the *what*.

Report honestly: if a part is blocked, finish everything else and say plainly what you left out
and why. Scaling the work down is the owner's call.
