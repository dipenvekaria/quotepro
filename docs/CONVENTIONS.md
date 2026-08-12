# Conventions

How code is written in this repo. Deviating is fine when you have a reason — say it in the PR.

## Formatting

`biome.json` is the authority: 2-space indent, 100-column lines, single quotes, no semicolons,
trailing commas everywhere, double quotes in JSX, LF endings. Python is 4-space (`.editorconfig`)
and formatted by ruff.

Don't format by hand and don't argue with the formatter. `lefthook.yml` wires biome and ruff
into pre-commit, and `tsc --noEmit` plus pytest into pre-push, once the toolchain migration
lands.

## File layout

Colocate by route. A page owns its data access, its mutations, and its client components:

```
src/app/app/(shell)/pipeline/[id]/
  page.tsx               Server Component. Reads with query(), renders.
  actions.ts             'use server'. Mutations.
  work-item-detail.tsx   'use client'. Interaction only.
```

Promote to `src/lib/` or `src/components/shared/` when a **second** route needs it — not in
anticipation. Premature sharing is how the old `src/components/features/` tree became
unmaintainable.

Keep files under ~300 lines. Two live files break this badly (`work-item-detail.tsx` at 1,012
and `dashboard/page.tsx` at 734); splitting them is tracked in the cleanup plan. Don't add more.

## Naming

| Thing | Convention | Example |
| --- | --- | --- |
| Route files | Next.js reserved names | `page.tsx`, `layout.tsx`, `route.ts` |
| Components | kebab-case file, PascalCase export | `work-item-detail.tsx` → `WorkItemDetail` |
| Server actions | verb-first camelCase | `createDraftQuote`, `saveLineItems` |
| Query helpers | `get*` single, `list*` many | `getWorkItemDetail`, `listWorkItems` |
| Types | PascalCase, `type` over `interface` | `type WorkItemSummary = { … }` |
| SQL | lowercase keywords in TS template literals | `select id from work_items where …` |
| Migrations | `YYYYMMDDHHMMSS_snake_case.sql` | `20260806000000_team_invitations.sql` |

## Data access

Everything through `query()`, `withTransaction()`, or `withUser()` from `@/lib/db`.

**Always parameterized.** No string interpolation into SQL, ever, including for column names
and `ORDER BY` — use a whitelist lookup if the sort column is dynamic.

**Always tenant-scoped.** The pool bypasses RLS. Every statement touching company data carries
`where company_id = $n`, and every mutation verifies ownership of the target row first.

```ts
const { companyId } = await requireSession()

const rows = await query<WorkItemRow>(
  `select id, job_name, status, total
     from work_items
    where company_id = $1 and kind = $2
    order by created_at desc
    limit $3`,
  [companyId, 'quote', 50],
)
```

Multi-statement writes go in `withTransaction()`. Anything calling a SQL function that uses
`auth.uid()` internally — `create_work_item_with_customer`, `bootstrap_company` — goes in
`withUser(userId, ...)`.

Type the result explicitly (`query<Row>`). `pg` returns `any` otherwise, and the whole point of
strict mode evaporates.

Remember the custom parsers in `src/lib/db/index.ts`: money arrives as `number`, timestamps as
ISO `string`, not `Date`.

## Server actions

```ts
'use server'

const inputSchema = z.object({ /* … */ })

export async function doThing(input: unknown) {
  const parsed = inputSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const session = await getSession()
  if (!session) return { ok: false as const, error: 'Not authenticated' }

  // verify ownership, mutate, then:
  revalidatePath('/app/pipeline')
  return { ok: true as const, data: { id } }
}
```

Rules:

- Validate every input with Zod. The client is not trusted, even though you wrote it.
- `getSession()` in actions (returns null), `requireSession()` in pages (redirects).
- Return `{ ok: true, data } | { ok: false, error }`. Never throw to the client.
- Never return a raw database error message — it leaks schema. Map to something a contractor
  can read.
- `revalidatePath()` for every route whose data changed.
- `as const` on `ok` so TypeScript narrows the union at the call site.

## Components

Server by default. `'use client'` only for state, effects, or event handlers — and push it as
far down the tree as it will go.

Use `src/components/ui/` primitives. There are 19 shadcn components already; a hand-rolled
button that looks 95% right is worse than the one that's there.

The React Compiler is on. Don't hand-write `useMemo`/`useCallback` unless you've measured
something.

Loading and empty states are part of the feature, not polish. `src/components/shared/empty-state.tsx`
exists — use it. A blank screen where data should be reads as broken.

## Styling

Tailwind utilities only. No CSS modules, no styled-components, no inline `style` except for
genuinely computed values.

Colour comes from the design tokens in `src/app/globals.css` — `bg-background`, `text-muted-foreground`,
`border-border`. Never a raw Tailwind palette class (`bg-slate-100`, `text-gray-500`): those
don't respond to the theme and they break the monochrome identity.

The `rivet-ui` skill covers the design system properly. Read it before building a page.

## TypeScript

`strict: true`. No `any` — use `unknown` and narrow. No `@ts-nocheck` in new code; the files
that have it are all in the dead tree and are being deleted.

`tsc --noEmit` must be clean on live code. `next.config.ts` sets `ignoreBuildErrors: true`
purely because the dead `(dashboard)` tree doesn't compile — it is not permission to ship type
errors.

## AI

There is no Python. Gemini is called from `src/lib/ai/` inside the server actions
([ADR 0009](adr/0009-ai-in-process.md)).

Model policy is fixed and not up for negotiation: **Google Gemini only.** No GPT, Claude, Llama,
Mistral, or Cohere in product code. Temperature ≤ 0.2. `responseMimeType: "application/json"`
whenever the output is parsed, with a `responseSchema`.

Prompts live in `prompts/` as markdown. Editing behaviour means editing a prompt file, not
embedding a new string literal.

Never let a model set a number that reaches a customer. Resolve it against the database first —
`reconcile()` in `src/lib/ai/quote.ts` is the pattern.

## Comments

Comment the *why*. The *what* is already in the code.

```ts
// pg parses timestamps into Date objects by default. Return raw ISO strings so
// values match our `string` types and support .slice() the way the old client did.
types.setTypeParser(1114, asRawString)
```

No `// TODO`, no `// FIXME`, no commented-out code. If it needs doing, it goes in an issue or
in `CLEANUP_PLAN.md`.

## Git

Branch off `main`. It is the only branch.

Conventional commits, terse subject, no body unless it earns one:

```
fix(pipeline): detail 404 on missing address
feat(team): invite teammates by role persona
refactor(db): convert settings actions to pg
```

One concern per PR. A PR that renames files *and* changes behaviour is a PR nobody can review.

## Documentation

Don't create markdown files unless asked. The repo has ~140 of them and most are misleading —
that's the problem this set of docs is fixing, not a pattern to continue.

Non-obvious decisions get an ADR in `docs/adr/`: context, decision, consequences, date. Four
sections, one page.

When behaviour changes, update the doc that describes it in the same PR. A stale doc is worse
than no doc, because someone will believe it.
