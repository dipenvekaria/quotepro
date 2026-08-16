import { FunctionTool, LlmAgent, Runner } from '@google/adk'
import { z } from 'zod'

import { ensureAdc } from './adc'
import { geminiModels } from './gemini'
import { PostgresSessionService } from './quote-session'
import {
  addLineItem,
  applyDiscount,
  findCatalogItems,
  readQuote,
  removeLineItem,
  updateLineItem,
  type ToolContext,
} from './quote-tools'

/**
 * The quoting agent.
 *
 * One agent, one quote, one persistent conversation. The contractor says
 * "change the thermostat", gets a price, says "knock 10% off", and the quote
 * updates — because these tools edit rows rather than returning a new list for
 * the editor to swap in.
 *
 * The context — which company, which quote — is closed over when the agent is
 * built, never passed through the model. The model decides *what* to do; it has
 * no say in whose data it does it to, and no argument it could set to change
 * that.
 */

const APP_NAME = 'rivet-quoting'

/** A runaway tool loop is the failure mode; this is the ceiling. */
const MAX_TURNS = 12

const SYSTEM_INSTRUCTION = `You help a trades contractor build a quote for their customer.

You are editing a quote that already exists. Never start over. When the contractor
asks for a change, make that change and leave everything else alone — they may have
adjusted prices by hand, and those adjustments are theirs to keep.

Work only from their catalog. Use search_catalog to find items, then add_line_item
with the id you found. You cannot invent an item or set a price for one that does
not exist, and you should not try: if the catalog cannot cover what was asked, say
so plainly and ask what they would like to do.

Before changing or removing a line, call read_quote so you are acting on what is
actually there rather than what you remember.

Be brief. A contractor is reading this on a phone, often between jobs. State what
you did and what it cost — no preamble, no restating the request.`

function tools(ctx: ToolContext) {
  return [
    new FunctionTool({
      name: 'search_catalog',
      description:
        "Search the contractor's own price book. Use the customer's own words; " +
        'the search understands symptoms as well as product names.',
      parameters: z.object({
        query: z.string().describe('what to look for, e.g. "furnace not heating"'),
      }),
      execute: async ({ query: q }) => findCatalogItems(ctx, q),
    }),

    new FunctionTool({
      name: 'read_quote',
      description: 'The lines currently on this quote, with their ids and the subtotal.',
      parameters: z.object({}),
      execute: async () => readQuote(ctx),
    }),

    new FunctionTool({
      name: 'add_line_item',
      description:
        'Add a catalog item to the quote. The price comes from the catalog — you do not set it.',
      parameters: z.object({
        catalog_item_id: z.string().describe('id returned by search_catalog'),
        quantity: z.number().optional().describe('defaults to 1'),
      }),
      execute: async ({ catalog_item_id, quantity }) =>
        addLineItem(ctx, catalog_item_id, quantity ?? 1),
    }),

    new FunctionTool({
      name: 'update_line_item',
      description: 'Change the quantity or unit price of one line already on the quote.',
      parameters: z.object({
        line_id: z.string().describe('id from read_quote'),
        quantity: z.number().optional(),
        unit_price: z.number().optional(),
      }),
      execute: async ({ line_id, quantity, unit_price }) =>
        updateLineItem(ctx, line_id, { quantity, unit_price }),
    }),

    new FunctionTool({
      name: 'remove_line_item',
      description: 'Take one line off the quote.',
      parameters: z.object({ line_id: z.string().describe('id from read_quote') }),
      execute: async ({ line_id }) => removeLineItem(ctx, line_id),
    }),

    new FunctionTool({
      name: 'apply_discount',
      description:
        'Add a discount line. Give either a percentage or a cash amount, not both. ' +
        'This adds a negative line rather than changing the prices above it.',
      parameters: z.object({
        percent: z.number().optional().describe('e.g. 10 for 10% off'),
        amount: z.number().optional().describe('a cash amount off, in dollars'),
        label: z.string().optional().describe('what the customer will see'),
      }),
      execute: async ({ percent, amount, label }) =>
        applyDiscount(ctx, { percent, amount, label }),
    }),
  ]
}

/**
 * A runner bound to one company and one quote.
 *
 * Built per request rather than cached: the context is the security boundary,
 * and a cached agent is one deploy away from answering for the wrong tenant.
 */
export function quoteRunner(ctx: ToolContext) {
  // ADK resolves Vertex credentials through ADC, not through the object the
  // rest of this codebase passes to @google/genai. Without this it fails with
  // `invalid_grant`, which reads like an expired key rather than an absent one.
  ensureAdc()

  const agent = new LlmAgent({
    name: 'quote_assistant',
    // Same chain the rest of the product uses, so a model change lands here too.
    model: geminiModels()[0],
    instruction: SYSTEM_INSTRUCTION,
    tools: tools(ctx),
    generateContentConfig: {
      // Money and tool arguments must be deterministic — the standing rule for
      // every model call in this codebase.
      temperature: 0,
      maxOutputTokens: 1024,
    },
  })

  return new Runner({
    appName: APP_NAME,
    agent,
    sessionService: new PostgresSessionService(ctx.companyId),
  })
}

export type AgentTurn = {
  reply: string
  toolCalls: string[]
}

/**
 * One turn of conversation against a quote.
 *
 * Returns what to show the contractor and which tools ran — the second is for
 * the UI to know it should refresh the line items, and for a human to see what
 * the agent actually did rather than only what it said it did.
 */
export async function runQuoteTurn(
  ctx: ToolContext,
  userId: string,
  message: string,
): Promise<AgentTurn> {
  const runner = quoteRunner(ctx)

  await runner.sessionService.getOrCreateSession({
    appName: APP_NAME,
    userId,
    sessionId: ctx.workItemId,
  })

  const reply: string[] = []
  const toolCalls: string[] = []
  let turns = 0

  for await (const event of runner.runAsync({
    userId,
    sessionId: ctx.workItemId,
    newMessage: { role: 'user', parts: [{ text: message }] },
  })) {
    if (++turns > MAX_TURNS) break

    for (const part of event.content?.parts ?? []) {
      if (part.functionCall?.name) toolCalls.push(part.functionCall.name)
      if (part.text) reply.push(part.text)
    }
  }

  return { reply: reply.join('').trim(), toolCalls }
}
