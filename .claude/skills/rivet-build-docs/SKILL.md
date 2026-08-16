---
name: rivet-build-docs
description: Use when writing or updating anything in docs/, recording a decision as an ADR, or when a document's claims may have gone stale. Documentation here is agent context as well as human reading, so a wrong doc actively propagates the error.
---

# Technical Writer

Documents in this repo load into agent sessions. A stale claim does not sit quietly — it gets
believed and acted on.

`CLAUDE.md` once led with the finding that no catalog item could be created and therefore no new
account could quote. `catalog/actions.ts` had full CRUD, CSV import and AI extraction. That file
loads into *every* session, so the wrong belief propagated until someone read the code.

## Verify before writing

**Every status claim gets checked against the code or the database on the day you write it.**
Not carried forward from the previous revision. A re-verification of the two GTM checklists
found four items marked ❌ that had shipped and a price that no longer matched the pricing
decision.

Put the review date in the document and say that statuses rot — tell the reader to re-verify
rather than trust.

## Separate what you know from what you assume

Mark findings **verified** (you ran it) or **inferred** (you read it). `docs/PRODUCT_UX_REVIEW.md`
uses this convention and it is the thing that makes the document trustworthy.

Where a check was impossible — no credential, no environment — say so explicitly rather than
presenting an assumption as a result.

## ADRs

Non-obvious decisions go in `docs/adr/` as `NNNN-short-title.md`. Record what was **rejected**
and why, not just what was chosen — the purpose is to stop the decision being relitigated every
time someone reads a competitor's marketing page or finds an abandoned artifact in the tree.

Amend rather than delete when a decision changes. ADR 0005 is amended by 0009 and both are
readable; `ARCHITECTURE_SCALE.md` carries a correction to its own recommendation, and that
correction is the most useful paragraph in it.

## House style

Terse. Lead with the finding, then the evidence. Prose over bullet soup for reasoning; tables
for comparisons and numbers.

Do not create `.md`, TODO, ROADMAP or summary files unless explicitly asked. Written
deliverables belong in `docs/` as markdown — not published as web artifacts.

Comment the *why*, never the *what*, and that applies to prose too.

## What must not go in

**The GitHub repo is public.**

- No secrets, keys or tokens.
- No project ids, account ids, personal emails or hostnames — `docs/SECURITY_REVIEW.md` carries a
  standing note about this after they were published once and had to be redacted.
- No founder-private matters — equity, vesting, personal finances. These documents are shared
  with collaborators.

```bash
git diff | grep -iE 'sk-|sbp_|GOCSPX|BEGIN .*PRIVATE KEY|api[_-]?key\s*='
```

## Keeping the map honest

When a feature ships, the checklist that tracked it gets updated in the same PR. A checklist
claiming ❌ for something built is worse than no checklist — it sends the next person to rebuild
it, and it is how a finished QuickBooks export ended up behind a "Coming soon" label.

The documents most worth keeping true, because they are read first:

| Doc | Why it matters |
| --- | --- |
| `CLAUDE.md` | loads into every session |
| `docs/CODEBASE_MAP.md` | what is live and what is dead |
| `docs/GTM_PRODUCT_CHECKLIST.md` | what is built and what is not |
| `docs/ARCHITECTURE.md`, `docs/adr/` | why it is like this |
