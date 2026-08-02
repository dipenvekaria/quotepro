# `src/features/`

Feature-based modules. Each subdirectory is one business capability, colocated:

```
features/<capability>/
├── components/    # React components (client + server)
├── hooks/         # Zustand stores, custom React hooks
├── actions.ts     # Server actions (Zod-validated, RLS-safe)
├── queries.ts     # RSC-safe data fetchers (Supabase server client)
├── schemas.ts     # Zod domain schemas
└── README.md      # Feature overview (optional)
```

## Conventions

- **queries.ts** = read paths for React Server Components. Uses `createClient()` from `@/lib/supabase/server`. Returns domain shapes derived from `@/types/database.types`.
- **actions.ts** = write paths for `'use server'` actions. Validates input with Zod. Returns discriminated `{ ok, data }` / `{ ok: false, error }`.
- **schemas.ts** = the only place a feature's Zod schemas live. Re-exported types (`type Foo = z.infer<typeof fooSchema>`) go here too.
- **components/** = feature-specific UI. Cross-cutting shared components live in `src/components/shared/`.
- **hooks/** = only cross-cutting hooks used by more than one component in the feature.

## Rules

- Server actions never import client-only code.
- A file with `'use client'` cannot import `queries.ts` (they use the server client).
- No component may exceed **300 lines**. Split composed pieces.
- Absolute imports only: `@/features/quotes/...`, never `../..`.
- Every action + query has a corresponding test in `tests/` once Phase 7 lands.

## Capabilities

| Folder          | Status  | Notes                                                 |
| --------------- | ------- | ----------------------------------------------------- |
| `work-items/`   | Scaffold | Core repo for the unified `work_items` table.         |
| `ai/`           | Scaffold | Vercel-AI-SDK-style hooks over the FastAPI backend.    |
| `catalog/`      | Scaffold | Catalog search + import.                              |
| `quotes/`       | TODO    | Slice view of `work_items` where `kind='quote'`.       |
| `leads/`        | TODO    | Slice view where `status='lead'`.                     |
| `jobs/`         | TODO    | Slice view where `kind='job'`.                        |
| `invoices/`     | TODO    | Invoice CRUD + Stripe hosted checkout link.           |
| `customers/`    | TODO    | Customer list + detail.                               |
| `analytics/`    | TODO    | Sales / team / AI dashboards.                         |
| `notifications/`| TODO    | SMS + email preferences.                              |

Populated as pages are refactored off of `src/app/(dashboard)/…`.
