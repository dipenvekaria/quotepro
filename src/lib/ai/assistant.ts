import { FunctionTool, LlmAgent, Runner } from '@google/adk'
import { z } from 'zod'

import { ensureAdc } from './adc'
import {
  businessSummary,
  findCustomers,
  findWork,
  lookupCatalog,
  overdueInvoices,
  todaysSchedule,
  type AssistantContext,
} from './assistant-tools'
import { envServer } from '@/lib/env'
import { geminiModels } from './gemini'
import { PostgresSessionService } from './quote-session'

/**
 * The product-wide assistant.
 *
 * One continuing conversation per person — not per record, which is what the
 * quoting agent does. A contractor asking "what's on today" in the morning and
 * "did the Garcia quote come back" in the afternoon is having one conversation,
 * and the session is keyed on the user for that reason.
 *
 * **Everything it can do, it can only do as the person asking.** The context
 * carries company, user and role; the tools consult all three; the model sees
 * none of them and has no argument that could change one. That is the whole
 * security design, and `tests/integration/assistant-role-access.test.ts` checks
 * it without a model in the loop — because the model is the thing being
 * defended against, not part of the defence.
 */

const APP_NAME = 'rivet-assistant'
const MAX_TURNS = 12

const INSTRUCTION = `You are Bolt, the assistant inside Rivet, a job-management product for
trades contractors. You are talking to one person at one company. You answer two kinds of
questions: what is happening in their business (use the tools), and how to do things in
Rivet (use the guide below).

HOW RIVET WORKS — answer how-to questions from this, with the path to tap:
- Draft a quote: New quote → describe the job in plain words. Line items come from the
  company's own price book at their prices. A vague description gets a clarifying
  question with tappable answers, never a guess.
- Send and sign: Send emails the customer a link — no login on their side. They review
  the lines and the company's terms and type their name to approve. The acceptance
  record (signer, time, IP, the exact terms as accepted) lives on the job's page, and
  the signed PDF is one tap away.
- Schedule: a won quote becomes a job from its page. The calendar knows job length from
  the price book's labour hours. Repeating work: open the job → Details → Repeats →
  choose weekly, every 2 weeks, or monthly — each visit becomes its own scheduled job,
  and "Email the invoice automatically" makes it bill itself.
- Invoice and get paid: from a completed job → Convert to invoice → Send. Customers pay
  online through the company's Stripe; cash and checks are recorded by hand on the
  invoice.
- Reviews: on a completed job, Request review emails the customer the company's Google
  and Facebook review links. Links are set in Settings.
- Books: Integrations → QuickBooks Online → Connect. Every invoice and payment posts
  itself afterwards.
- Bring data over: Customers → Import walks through leaving Jobber, Housecall Pro, or
  Joist. The price book imports from a CSV or a photo of an old rate sheet (Price book →
  Import).
- Team: Settings → Invite team. Roles are owner, office, technician; technicians see
  their own work and no money.
- Terms, logo, tax #, review links, billing: all in Settings.

Answer from the tools, never from memory or assumption. If a tool refuses because of
the person's role, say so plainly and move on — do not try another route to the same
information, and do not speculate about what the number might be.

Never state a number a tool did not give you. If a price, total or figure is missing,
hidden, or marked unavailable, say that you cannot see it. An invented price becomes a
promise to a customer that the contractor has to honour, so a wrong number is far worse
than no number.

You are read-only, by design. You can look anything up, but you never create, change,
send, or schedule anything — the person does that themselves, and your job is to tell
them exactly where to tap. Never imply you did something.

Be brief and concrete. This is read on a phone, often between jobs. Lead with the
answer. Give amounts and dates plainly. Skip preamble and do not restate the question.
For lists use short "- " bullets, one item per line; use **bold** only for names and
amounts. Never number your sentences. Rewrite any timestamp as a short human date —
"Aug 21, 12:42 PM" — never a raw database timestamp.

When something is ambiguous — which customer, which quote — ask rather than guessing.`

function tools(ctx: AssistantContext) {
  return [
    new FunctionTool({
      name: 'todays_schedule',
      description: "What is scheduled today for the person asking. A technician gets their own round.",
      parameters: z.object({}),
      execute: async () => todaysSchedule(ctx),
    }),
    new FunctionTool({
      name: 'find_work',
      description: 'Find quotes and jobs. Optionally filter by status or search customer and description.',
      parameters: z.object({
        status: z.string().optional().describe('e.g. quote_sent, job_scheduled'),
        q: z.string().optional().describe('customer name or words from the description'),
      }),
      execute: async ({ status, q }) => findWork(ctx, { status, q }),
    }),
    new FunctionTool({
      name: 'find_customers',
      description: 'Look up customers by name, phone or email.',
      parameters: z.object({ q: z.string() }),
      execute: async ({ q }) => findCustomers(ctx, q),
    }),
    new FunctionTool({
      name: 'lookup_catalog',
      description: "Search the company's price book. Prices are included only if this person may see them.",
      parameters: z.object({ q: z.string() }),
      execute: async ({ q }) => lookupCatalog(ctx, q),
    }),
    new FunctionTool({
      name: 'business_summary',
      description:
        'Quotes sent, acceptance, revenue and open pipeline for the last 30 days. ' +
        'Owners and office managers only — it will refuse for anyone else.',
      parameters: z.object({}),
      execute: async () => businessSummary(ctx),
    }),
    new FunctionTool({
      name: 'overdue_invoices',
      description: 'Invoices past their due date. Owners and office managers only.',
      parameters: z.object({}),
      execute: async () => overdueInvoices(ctx),
    }),
  ]
}

export type AssistantTurn = {
  reply: string
  toolCalls: string[]
}

export async function runAssistantTurn(
  ctx: AssistantContext,
  message: string,
): Promise<AssistantTurn> {
  ensureAdc()

  // Support quality is worth the bigger model: Bolt defaults to the strongest
  // model in the chain (full flash over lite — the owner's call: a few cents
  // per conversation against a support ticket). ASSISTANT_MODELS overrides,
  // so a newer model is an env change, not a deploy.
  const chain = geminiModels()
  const model =
    envServer().ASSISTANT_MODELS?.split(',')[0]?.trim() || chain[chain.length - 1] || chain[0]

  const agent = new LlmAgent({
    name: 'rivet_assistant',
    model,
    instruction: INSTRUCTION,
    tools: tools(ctx),
    generateContentConfig: { temperature: 0, maxOutputTokens: 1024 },
  })

  const runner = new Runner({
    appName: APP_NAME,
    agent,
    // Keyed on the user: one continuing conversation, not one per record.
    sessionService: new PostgresSessionService(ctx.companyId, 'user'),
  })

  await runner.sessionService.getOrCreateSession({
    appName: APP_NAME,
    userId: ctx.userId,
    sessionId: ctx.userId,
  })

  const reply: string[] = []
  const toolCalls: string[] = []

  for await (const event of runner.runAsync({
    userId: ctx.userId,
    sessionId: ctx.userId,
    newMessage: { role: 'user', parts: [{ text: message }] },
  })) {
    // Cap TOOL CALLS, not stream events — a tool call is two events, so the
    // old counter cut the model off mid-thought after a few lookups. Same
    // fix the quoting agent needed.
    if (toolCalls.length > MAX_TURNS) break

    for (const part of event.content?.parts ?? []) {
      if (part.functionCall?.name) toolCalls.push(part.functionCall.name)
      if (part.text) reply.push(part.text)
    }
  }

  return { reply: reply.join('').trim(), toolCalls }
}
