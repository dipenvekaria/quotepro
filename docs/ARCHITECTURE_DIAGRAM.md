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

## The AI, end to end

Everything below runs inside the same Next.js process. ADK is a library here, not a service —
`@google/adk` is TypeScript, so there is no second runtime and no deploy target beyond the one
that already exists.

```mermaid
graph TB
    subgraph edge["What the contractor says"]
        MSG["“Add the Nest thermostat”<br/>“Now take 10% off”"]
    end

    subgraph agent["Quoting agent — in-process"]
        RUN["Runner"]
        LLM["LlmAgent<br/><i>Gemini · temp 0</i>"]
        SESS_SVC["PostgresSessionService"]
    end

    subgraph tools["Tools — the only things that can change a quote"]
        T1["search_catalog"]
        T2["read_quote"]
        T3["add_line_item"]
        T4["update_line_item · remove_line_item"]
        T5["apply_discount"]
        T6["propose_estimated_item"]
    end

    subgraph store["Postgres"]
        EMB[("document_embeddings<br/><i>pgvector 768</i>")]
        CAT[("catalog_items")]
        QI[("quote_items")]
        SESS[("ai_conversations<br/><i>session + run log</i>")]
    end

    VERTEX["Vertex AI<br/><i>Gemini · text-embedding-004</i>"]

    MSG --> RUN
    RUN --> LLM
    LLM <-->|"tool calls"| tools
    RUN <-->|"every turn"| SESS_SVC
    SESS_SVC <--> SESS
    LLM --> VERTEX

    T1 --> EMB
    T1 --> CAT
    T2 --> QI
    T3 --> CAT
    T3 --> QI
    T4 --> QI
    T5 --> QI
    T6 --> CAT
    T6 --> QI

    CTX["companyId + workItemId<br/><i>closed over — never a model argument</i>"]
    CTX -.->|"bound at construction"| tools

    classDef proc fill:#0a0a0a,stroke:#0a0a0a,color:#fff
    classDef db fill:#f4f4f5,stroke:#a1a1aa,color:#18181b
    classDef tool fill:#fff,stroke:#18181b,color:#18181b
    classDef guard fill:#fff,stroke:#dc2626,color:#7f1d1d,stroke-dasharray:4 3
    class RUN,LLM,SESS_SVC proc
    class EMB,CAT,QI,SESS db
    class T1,T2,T3,T4,T5,T6 tool
    class CTX guard
```

**The dashed box is the security boundary.** Company and quote are closed over when the agent is
built. The model decides *what* to do; it has no argument that could change *whose* data it does
it to.

---

## One turn, in order

```mermaid
sequenceDiagram
    autonumber
    participant C as Contractor
    participant A as Server Action
    participant R as Rate limiter
    participant G as ADK Runner
    participant V as Vertex
    participant P as Postgres

    C->>A: "Add the Nest thermostat, then 10% off"
    A->>R: check ai:generate:{company}
    R-->>A: allowed
    A->>P: load or create session (id = work_item id)

    A->>G: run turn
    G->>V: prompt + tool declarations
    V-->>G: call search_catalog("nest thermostat")
    G->>P: embed query → match_documents → catalog rows
    P-->>G: 2 thermostats, ranked
    G->>V: results
    V-->>G: call add_line_item(id, 1)
    G->>P: assertOwned, read price from catalog, insert quote_item
    V-->>G: call apply_discount(percent: 10)
    G->>P: read quote, insert negative line
    V-->>G: "Added Nest $249. 10% off, −$24.90."

    G->>P: append events to session
    A->>P: record run — model, tokens, cost, latency
    A-->>C: reply + the quote as it now stands
```

Step 15 is why the editor takes the returned quote wholesale rather than replaying the agent's
edits: the tools wrote to Postgres directly, so React state is stale the moment the action
returns.

---

## Two paths, and why

```mermaid
graph LR
    START{"Does the quote<br/>have lines?"}
    GEN["One-shot generation<br/><i>one model call, whole list</i>"]
    AGENT["Agent turn<br/><i>tools edit in place</i>"]

    START -->|"no — nothing to edit"| GEN
    START -->|"yes"| AGENT

    GEN --> RESULT[("quote_items")]
    AGENT --> RESULT

    style AGENT fill:#dcfce7,stroke:#16a34a,color:#14532d
```

A blank quote has nothing to edit, so the first draft is a *generation* — cheaper and simpler
than an agent loop for "give me a starting point". Everything after is an *edit*, because
regenerating throws away every price the contractor adjusted by hand.

The condition is **lines**, not whether the quote was saved. Gating on the saved id looked
equivalent and was not: nothing is saved until Save is pressed, which is *after* all the
iterating, so every follow-up instruction still regenerated.

---

## Retrieval

```mermaid
graph LR
    Q["“furnace not heating”"] --> E["embed<br/><i>text-embedding-004</i>"]
    E --> M["match_documents"]
    K["keyword / tsvector"] --> M
    Q --> K
    M --> RRF["reciprocal rank fusion"]
    RRF --> OUT["ranked catalog rows"]

    THRESH["vector_threshold 0.3"]
    THRESH -.-> M

    style THRESH fill:#fff,stroke:#a1a1aa,color:#18181b,stroke-dasharray:4 3
```

`match_documents` takes `match_company_id` as a **required** argument, so tenancy is enforced
inside the search rather than remembered around it.

The threshold is measured, not guessed. At the RPC's default of `0.6` the two queries most like
how a contractor actually talks returned **nothing**:

| Query | Top matches | At 0.6 |
| --- | --- | --- |
| "furnace not heating" | both furnaces at **0.559**, **0.540** | dropped |
| "wifi controls" | both Wi-Fi thermostats at **0.495**, **0.493** | dropped |
| "thermostat" | both thermostats at 0.664, 0.624 | kept |

The ranking was right every time; the cutoff was discarding the answer. It runs at 0.3, because
this feeds a model choosing from a shortlist — recall matters more than precision, and a
humidifier the model ignores costs a few tokens where a missing furnace costs the job.

---

## What stops a made-up price

```mermaid
graph TB
    MODEL["Gemini chooses<br/><i>what</i>"]
    ADD["add_line_item(catalog_item_id, qty)"]
    EST["propose_estimated_item(name)"]
    CAT[("catalog_items")]
    QI[("quote_items")]

    MODEL -->|"an id, never a price"| ADD
    MODEL -->|"a name, never a price"| EST
    ADD -->|"price read from the row"| CAT
    EST -->|"price from nearest comparable<br/>+ the contractor's own rates"| CAT
    CAT --> QI

    NONE["There is no tool that takes<br/>a free-text name AND a price."]
    NONE -.-> MODEL

    style NONE fill:#fff,stroke:#dc2626,color:#7f1d1d,stroke-dasharray:4 3
```

A hallucinated price the customer accepts is a contract the contractor has to honour. So the
mechanism is removed rather than instructed against: **no tool accepts both a name and a price.**

`propose_estimated_item` is the one line without a catalog row behind it, and it is fenced. The
model supplies only the name; the price comes from the contractor's nearest comparable item and
their own markup — never a web lookup, because a retail listing carries no labour, markup or
overhead and would under-quote systematically. It refuses rather than guessing when nothing is
close enough to reason from.

The resulting line is flagged `is_estimate`, and **that flag is internal**. The customer sees a
firm price at whatever the salesperson settled on. Both public paths select explicit columns, and
a test fails if anyone adds the column or reaches for `select('*')`.

One thing the tools taught that the prompt could not: asked for "$19 discount", free-text
generation kept writing "10% discount". `apply_discount` takes `percent` **or** `amount` as
separate parameters, so the model has to choose — the signature enforcing what prose could not.

---

## Sessions and traceability

```mermaid
graph LR
    WI[("work_items.id")]
    SESSION["ADK session id"]
    ROW[("ai_conversations")]

    WI ==>|"the same value"| SESSION
    SESSION --> ROW
    ROW --> HIST["model · prompt · tools<br/>tokens · cost · latency"]

    style WI fill:#f4f4f5,stroke:#a1a1aa,color:#18181b
    style ROW fill:#f4f4f5,stroke:#a1a1aa,color:#18181b
```

**The session id *is* the work item id.** A quote belongs to exactly one customer, so
"customer + quote" and "quote" name the same conversation — and the work item is the id the URL,
the pipeline and the invoice already key off. A separate session identifier would mean a mapping
table and a way for the two to disagree.

Every run is recorded whether it came from the agent or the one-shot path, so a quote can answer
what the AI did on it:

```
gemini:gemini-2.5-flash-lite  success
1577 in / 190 out   $0.000234   1888ms
prompt: Furnace is short cycling, replace the blower motor
```

A `mock` run — the keyword fallback, when Vertex is unreachable — records as **degraded** rather
than success. Silently shipping keyword-matched quotes to real customers looks like poor quality
instead of an outage, which is the failure nobody reports.

---

## Everything degrades rather than failing

| Missing | What happens |
| --- | --- |
| `GEMINI_API_KEY` / Vertex credentials | keyword match over the catalog, `mode: mock`, recorded as degraded |
| Embeddings unavailable | search falls back to trigram keyword |
| Index empty | same — keyword still answers |
| Rate limiter unavailable | fails **open**; quoting keeps working |
| Nothing comparable to estimate from | refuses, and says so |

The one thing that never happens is a made-up number presented as a real one.

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
