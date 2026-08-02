# API Reference

> **Populated in Phases 2 & 3.** Placeholder for Phase 0.

## FastAPI Endpoints

Base URL: `env.BACKEND_URL` (e.g. `http://localhost:8000` locally).

Auth: `Authorization: Bearer <supabase_jwt>` on every endpoint except public health.

### AI

- `POST /api/ai/generate-quote`
- `POST /api/ai/update-quote`
- `POST /api/ai/chat` (SSE)
- `POST /api/ai/optimize-quote`
- `POST /api/ai/suggest-upsells`
- `POST /api/ai/generate-job-name`
- `POST /api/ai/draft-invoice`

### Catalog

- `POST /api/catalog/search`
- `POST /api/catalog/import`

### Indexing

- `POST /api/index/backfill` (admin)

### Health

- `GET /api/health` — liveness
- `GET /api/ready` — readiness (DB, Gemini, Redis)
- `GET /api/metrics` — Prometheus / OTel

### Webhooks

- `POST /webhooks/stripe`
- `POST /webhooks/dropbox-sign`
- `POST /webhooks/twilio-sms`
- `POST /webhooks/lemonsqueezy`

## Next.js Server Actions

Declared per feature in `src/features/*/actions.ts`. Each is a `next-safe-action` action with Zod input validation.

Planned:

- `features/quotes/actions.ts` — createQuote, updateQuote, sendQuote, archiveQuote
- `features/work-items/actions.ts` — transitionStatus, assign, comment
- `features/customers/actions.ts` — upsertCustomer, addAddress
- `features/catalog/actions.ts` — importCsv, upsertItem
- `features/invoices/actions.ts` — createInvoice, markPaid, sendReminder

Full request/response shapes auto-generated from OpenAPI + Zod in Phase 9.
