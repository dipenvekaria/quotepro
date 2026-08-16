import { FunctionTool, LlmAgent, Runner } from '@google/adk'
import { z } from 'zod'

import { ensureAdc } from './adc'
import {
  businessSummary,
  createLead,
  findCustomers,
  findWork,
  lookupCatalog,
  overdueInvoices,
  proposeSendQuote,
  rescheduleWork,
  todaysSchedule,
  type AssistantContext,
} from './assistant-tools'
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

const INSTRUCTION = `You are the assistant inside Rivet, a job-management product for trades
contractors. You are talking to one person at one company.

Answer from the tools, never from memory or assumption. If a tool refuses because of
the person's role, say so plainly and move on — do not try another route to the same
information, and do not speculate about what the number might be.

Never state a number a tool did not give you. If a price, total or figure is missing,
hidden, or marked unavailable, say that you cannot see it. An invented price becomes a
promise to a customer that the contractor has to honour, so a wrong number is far worse
than no number.

You cannot send anything to a customer. Tools whose names begin with "propose" prepare
an action and return it for the person to confirm; say clearly that nothing has been
sent yet.

Be brief and concrete. This is read on a phone, often between jobs. Lead with the
answer. Give amounts and dates plainly. Skip preamble and do not restate the question.

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
    new FunctionTool({
      name: 'create_lead',
      description: 'Start a new lead with a customer and a description of the work.',
      parameters: z.object({
        customer_name: z.string(),
        description: z.string(),
        phone: z.string().optional(),
      }),
      execute: async (input) => createLead(ctx, input),
    }),
    new FunctionTool({
      name: 'reschedule_work',
      description: 'Move a scheduled job. The job keeps its length — the end time shifts with the start.',
      parameters: z.object({
        work_item_id: z.string(),
        starts_at: z.string().describe('ISO timestamp'),
      }),
      execute: async ({ work_item_id, starts_at }) => rescheduleWork(ctx, work_item_id, starts_at),
    }),
    new FunctionTool({
      name: 'propose_send_quote',
      description:
        'Prepare to email a quote to the customer. This does NOT send it — it returns a ' +
        'proposal for the person to confirm. Always tell them nothing has been sent.',
      parameters: z.object({ work_item_id: z.string() }),
      execute: async ({ work_item_id }) => proposeSendQuote(ctx, work_item_id),
    }),
  ]
}

export type AssistantTurn = {
  reply: string
  toolCalls: string[]
  /** Set when the assistant prepared an outward-facing action awaiting confirmation. */
  proposal?: { action: string; work_item_id: string; summary: string }
}

export async function runAssistantTurn(
  ctx: AssistantContext,
  message: string,
): Promise<AssistantTurn> {
  ensureAdc()

  const agent = new LlmAgent({
    name: 'rivet_assistant',
    model: geminiModels()[0],
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
  let proposal: AssistantTurn['proposal']
  let turns = 0

  for await (const event of runner.runAsync({
    userId: ctx.userId,
    sessionId: ctx.userId,
    newMessage: { role: 'user', parts: [{ text: message }] },
  })) {
    if (++turns > MAX_TURNS) break

    for (const part of event.content?.parts ?? []) {
      if (part.functionCall?.name) toolCalls.push(part.functionCall.name)
      if (part.text) reply.push(part.text)

      // Surface a proposal structurally, so the interface can render a confirm
      // button rather than the person having to trust prose.
      const res = part.functionResponse?.response as Record<string, unknown> | undefined
      if (res?.proposed) {
        proposal = {
          action: String(res.action),
          work_item_id: String(res.work_item_id),
          summary: String(res.summary),
        }
      }
    }
  }

  return { reply: reply.join('').trim(), toolCalls, proposal }
}
