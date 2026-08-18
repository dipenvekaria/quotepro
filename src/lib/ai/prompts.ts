/**
 * Prompt loading.
 *
 * Prompts live in `prompts/*.md` so behaviour changes are reviewable as prose
 * rather than buried in string literals. Everything above the first `---`
 * divider is documentation for whoever edits the file; everything below it is
 * the prompt.
 *
 * These files are pulled into the serverless bundle by
 * `outputFileTracingIncludes` in next.config.ts. A missing or empty file
 * **throws** rather than degrading to an inline default: the silent fallback
 * masked exactly the packaging mistake it was meant to survive, running old
 * prompt text in production while the repo said otherwise. A loud failure gets
 * fixed the same day (standing rule: no silent fallbacks — fail hard).
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const cache = new Map<string, string>()

export function loadPrompt(name: string): string {
  const hit = cache.get(name)
  if (hit !== undefined) return hit

  let body: string
  try {
    body = readFileSync(join(process.cwd(), 'prompts', name), 'utf8')
  } catch (e) {
    throw new Error(
      `Prompt file prompts/${name} could not be read. If this is production, ` +
        `check outputFileTracingIncludes in next.config.ts — the prompts must ` +
        `ship with the bundle. (${e instanceof Error ? e.message : String(e)})`,
    )
  }

  const divider = body.indexOf('\n---\n')
  const text = (divider === -1 ? body : body.slice(divider + 5)).trim()
  if (!text) throw new Error(`Prompt file prompts/${name} has no prompt body below its --- divider.`)

  cache.set(name, text)
  return text
}
