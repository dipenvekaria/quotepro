# Rivet — architecture

Date: 2026-08-16

One Next.js process runs the whole product. There is no second service, no worker, and no queue.
Everything below happens inside it or in Postgres.

---

## The system

```mermaid
graph TB
    subgraph clients["People"]
        OWNER["Contractor / office<br/><i>desktop and phone</i>"]
        TECH["Technician<br/><i>phone, in a driveway</i>"]
        HOMEOWNER["Homeowner<br/><i>one unguided visit</i>"]
    end

    subgraph vercel["Vercel — one Next.js process"]
        direction TB
        APP["Signed-in app<br/><code>/app/**</code><br/><i>Server Components read, Server Actions write</i>"]
        PUBLIC["Public viewers<br/><code>/q/{token}</code> · <code>/i/{token}</code><br/><i>no login, 128-bit token is the credential</i>"]
        API["<code>/api/**</code><br/><i>authenticates itself — outside the middleware</i>"]
        AGENT["Quoting agent<br/><i>ADK · tools · sessions</i>"]
    end

    subgraph data["Supabase Postgres"]
        direction TB
        CORE[("work_items · customers<br/>catalog_items · quote_items<br/>invoices · payments")]
        VEC[("document_embeddings<br/><i>pgvector 768</i>")]
        SESS[("ai_conversations<br/><i>one session per quote</i>")]
        AUTH[("auth.users<br/><i>Supabase Auth</i>")]
    end

    subgraph google["Google Cloud"]
        VERTEX["Vertex AI<br/><i>Gemini · text-embedding-004</i>"]
        MAPS["Places · Routes"]
    end

    subgraph other["Other services"]
        STRIPE["Stripe Connect"]
        RESEND["Resend"]
    end

    OWNER --> APP
    TECH --> APP
    HOMEOWNER --> PUBLIC

    APP --> AGENT
    APP -->|"raw pg, every query<br/>scoped by company_id"| CORE
    PUBLIC -->|"service role,<br/>token lookup"| CORE
    API --> CORE

    AGENT -->|"search"| VEC
    AGENT -->|"read / edit lines"| CORE
    AGENT -->|"turns"| SESS
    AGENT --> VERTEX

    APP -->|"embed on write"| VERTEX
    APP --> MAPS
    APP --> STRIPE
    APP --> RESEND
    APP -.->|"JWT verify only,<br/>never data reads"| AUTH

    classDef proc fill:#0a0a0a,stroke:#0a0a0a,color:#fff
    classDef db fill:#f4f4f5,stroke:#a1a1aa,color:#18181b
    classDef ext fill:#fff,stroke:#a1a1aa,color:#18181b,stroke-dasharray:4 3
    class APP,PUBLIC,API,AGENT proc
    class CORE,VEC,SESS,AUTH db
    class VERTEX,MAPS,STRIPE,RESEND ext
```

**Two things this drawing is making a point about.** Auth is a dashed line because Supabase
verifies the JWT and nothing else — every read of company data goes through raw `pg`. And the
`pg` pool connects as superuser and **bypasses RLS**, so the `company_id` predicate on every
statement is the first line of defence, not the second. A static scanner in `tests/tenancy.test.ts`
fails the build on a statement that lacks one.

---

## Quoting, before and after

The change is not that the AI got better. It is that there is no longer a step that throws the
contractor's work away.

```mermaid
graph LR
    subgraph before["Before — one shot"]
        B1["job description"] --> B2["first 80 of 200<br/>catalog rows"]
        B2 --> B3["Gemini"]
        B3 --> B4["a complete list<br/>of line items"]
        B4 --> B5["editor replaces<br/><b>everything</b>"]
    end

    style B5 fill:#fee2e2,stroke:#dc2626,color:#7f1d1d
```

```mermaid
graph LR
    subgraph after["After — a conversation that edits"]
        A1["what the contractor said"] --> A2["agent"]
        A2 -->|"search_catalog"| A3[("hybrid search<br/>vector + keyword")]
        A2 -->|"read_quote"| A4[("quote_items")]
        A2 -->|"add · update · remove<br/>apply_discount"| A4
        A2 <-->|"every turn"| A5[("session<br/>= work_item id")]
    end

    style A4 fill:#dcfce7,stroke:#16a34a,color:#14532d
```

Worked example, run end to end against real rows:

| The contractor says | Tools that ran | Result |
| --- | --- | --- |
| "Add the Nest thermostat." | `search_catalog` → `add_line_item` | $249.00 |
| "Now take 10% off." | `apply_discount` | −$24.90 · **$224.10** |
| "What is on the quote?" | `read_quote` | reads back both lines |

The second row is the one that was impossible. Nothing regenerated, so the first line — including
any price the contractor had adjusted by hand — is untouched.

---

## Why the agent cannot invent a price

```mermaid
graph TB
    MODEL["Gemini decides<br/><i>what</i> to do"]
    TOOLS["Tool layer"]
    CTX["company_id + work_item_id<br/><i>closed over, never a model argument</i>"]
    OWN["assertOwned()"]
    CAT[("catalog_items")]
    QI[("quote_items")]

    MODEL -->|"catalog_item_id + quantity"| TOOLS
    CTX --> TOOLS
    TOOLS --> OWN
    OWN -->|"id AND company_id,<br/>throws otherwise"| QI
    TOOLS -->|"price read from here,<br/>never from the model"| CAT
    CAT --> QI

    NOTE["There is no tool that accepts<br/>a free-text name and a price."]
    NOTE -.-> TOOLS

    style NOTE fill:#fff,stroke:#dc2626,color:#7f1d1d,stroke-dasharray:4 3
    style CTX fill:#f4f4f5,stroke:#a1a1aa,color:#18181b
```

A hallucinated price the customer accepts is a contract the contractor has to honour. Rather than
instructing the model not to invent one, the tool that would let it does not exist — every line
names a `catalog_item_id` that must resolve for that company, and the price is read from that
row. The model chooses *what*; it never chooses *whose*.

---

## How a catalog item becomes searchable

```mermaid
sequenceDiagram
    autonumber
    participant C as Contractor
    participant A as Server Action
    participant P as Postgres
    participant V as Vertex

    C->>A: save a price
    A->>P: insert / update catalog_items
    A-->>C: saved (response sent)
    Note over A,V: after() — the contractor is not waiting
    A->>V: embed name + category + description
    V-->>A: 768-dim vector
    A->>P: upsert document_embeddings
```

Indexing lives on the write path rather than in a nightly job. An index that drifts answers
confidently with last week's prices, and nobody notices until a customer accepts one.

Retrieval goes through `match_documents`, which fuses vector and full-text results with
reciprocal rank fusion and takes `match_company_id` as a **required** argument — tenancy is
enforced inside the search rather than remembered around it.

One measured detail worth keeping: the RPC's default similarity threshold of `0.6` returned
**nothing** for "furnace not heating" (the furnaces scored 0.559) and "wifi controls" (0.495).
The ranking was right every time; the cutoff was discarding it. It runs at 0.3, because this
feeds a model choosing from a shortlist — recall matters more than precision.

---

## What runs where

| Concern | Where | Note |
| --- | --- | --- |
| Reads | Server Components → `query()` | raw `pg`, parameterised, `company_id` on every statement |
| Writes | Server Actions in `actions.ts` | Zod in, `{ ok, data } \| { ok, error }` out — never throws to the client |
| Agent | in-process, `@google/adk` | TypeScript; no Python and no second service |
| Sessions | `ai_conversations` | ADK's `BaseSessionService` implemented over raw `pg`, not its MikroORM one |
| Embeddings | Vertex `text-embedding-004` | 768 dims, fixed by the column that predates it |
| Auth | Supabase | JWT verification only |
| Public links | `work_items.public_token` | 128-bit hex, never the UUID |

## Costs that shape the design

| | measured |
| --- | --- |
| One AI quote draft | $0.00035 |
| All variable cost per customer / month | ~$0.24 |
| Fixed infrastructure | ~$111 / month |
| Gross margin at $249 | 96.9% |

The AI is three hundredths of one percent of the subscription, so model choice is a latency and
quality decision rather than a cost one. What *is* worth caching is anything billed per call with
a stable answer — drive times between two addresses, which is why `travel_estimates` exists and
is shared across companies. A distance belongs to nobody.
