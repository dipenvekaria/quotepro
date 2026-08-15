# ADR 0006: Standardise on pnpm + biome + vitest + uv + ruff

**Status**: Accepted (migration not yet executed)
**Date**: 2026-08-07
**Deciders**: @dipenvekaria

## Context

The repo has two toolchains: one configured, one installed.

**Configured** — `justfile`, `biome.json`, `lefthook.yml`, `.tool-versions`, and
`.github/workflows/ci.yml` all assume pnpm 9, biome, vitest, playwright, uv, and ruff. `ci.yml`
runs `pnpm biome check`, `pnpm vitest run`, `uv sync`, `uv run ruff check`, `uv run pytest`.

**Installed** — `package.json` has npm scripts and eslint. There is no `pnpm-lock.yaml`, no
biome, no vitest, no playwright, no `uv.lock`, and no pytest run. `python-backend` uses
`requirements.txt` and a venv.

Consequence: CI cannot pass as written, `just` recipes fail on the first command, `lefthook`
hooks would error if installed, and a new engineer following the documented commands hits a wall
immediately. Two of the three quality signals in the repo are fictional.

## Decision

**Make reality match the configuration.** The target toolchain is:

| | Tool | Replaces |
| --- | --- | --- |
| Node packages | **pnpm 9** | npm |
| JS lint + format | **biome** | eslint + prettier |
| Unit tests | **vitest** | nothing |
| E2E | **playwright** | nothing |
| Python packages | **uv** | pip + venv + requirements.txt |
| Python lint + format | **ruff** | nothing |
| Git hooks | **lefthook** | nothing |
| Task runner | **just** | shell scripts |

Rationale for keeping the configured side rather than rewriting it to match npm:

- **pnpm** — content-addressed store, meaningfully faster installs, strict by default so
  phantom dependencies fail at install rather than in production. `.tool-versions` already pins
  9.15.0.
- **biome** — one Rust binary replacing eslint and prettier, roughly an order of magnitude
  faster, and `biome.json` is already written and tuned for this codebase (including the correct
  ignore list for the dead trees).
- **vitest** — shares Vite's transform pipeline, near-zero config with the existing setup.
  Whatever the runner, the argument for *having tests* is the real point: there are none, and
  the tenancy model is enforced entirely by convention.
- **uv** — 10–100× faster than pip, real lockfile, manages the Python version itself.
- **just** — `justfile` already documents every workflow; it just needs the underlying commands
  to exist.

The alternative — rewriting `justfile`, `biome.json`, `lefthook.yml`, and `ci.yml` down to npm
and eslint — is less work today but keeps the project without tests, without a Python lockfile,
and with a slower loop, in exchange for avoiding an afternoon of migration.

## Consequences

**Positive**
- CI becomes a real gate instead of a broken one. Today `tsc --noEmit` is the only honest check.
- Pre-commit and pre-push hooks start working, so formatting and type errors stop reaching PRs.
- Documented commands match what happens when you run them.

**Negative**
- One-time migration cost: lockfile conversion, dependency additions, script rewrites, and
  fixing whatever biome flags that eslint didn't. Realistically half a day plus follow-ups.
- Contributors need pnpm and uv installed. `corepack enable` and one `brew install` covers it.
- Biome's rule set differs from eslint's; expect a batch of new warnings on first run. Fix or
  explicitly disable — don't blanket-ignore.

**Neutral**
- Until the migration lands, **npm is what works**. `CLAUDE.md` and `docs/ONBOARDING.md`
  document npm as current and this ADR as the target, so nobody is misled in either direction.

## Migration

Sequenced as Phase 3 of `docs/CLEANUP_PLAN.md`. Deliberately scheduled after Phase 1 (deleting
the dead tree), because linting and typechecking ~200 dead files would generate noise nobody
should spend time on.

Done when a clean clone runs `pnpm install && just dev` successfully and `ci.yml` is green.

---

## Amendment — 2026-08-15

**uv and ruff are struck.** They existed for `python-backend/`, which was deleted when the AI
moved in-process ([ADR 0009](0009-ai-in-process.md)). What remains is three standalone scripts
(`scripts/db-health-check.py`, `validate-data.py`, `refactor_settings.py`) that do not justify a
Python toolchain, a lockfile or a CI step. This repo is TypeScript.

**vitest is adopted and landed.** 185 tests, including integration tests against a real Postgres
started by CI, a static tenancy scanner, and cross-tenant assertions. This is the only part of
the original ADR that shipped.

**biome is not adopted.** It was never installed — only a `biome.json` sat in the repo, config
for a tool absent from `package.json`, which is worse than having neither. That file is removed.
eslint is the linter, `npm run lint` is the command, and CI runs it. Adopting biome later is a
live option and a small one; it is not pending work.

**pnpm is not adopted.** `package-lock.json` and `npm ci` are the reality. The gain is install
speed and disk on a repo with one developer; the cost is a lockfile migration and a CI change.
Not worth it now.

So the target toolchain is simply: **npm + eslint + vitest**, which is also the current one. The
gap this ADR described is closed by narrowing the target, not by migrating to it.

`justfile` has been rewritten to drive the commands that exist; it previously invoked pnpm, uv,
ruff, biome, playwright, storybook and a deleted `python-backend/`, so every recipe failed.
