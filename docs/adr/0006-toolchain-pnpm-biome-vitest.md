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
