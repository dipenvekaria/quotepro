/**
 * Prompt loading.
 *
 * Prompts live in `prompts/*.md` so behaviour changes are reviewable as prose
 * rather than buried in string literals. Everything above the first `---`
 * divider is documentation for whoever edits the file; everything below it is
 * the prompt.
 *
 * These files are pulled into the serverless bundle by
 * `outputFileTracingIncludes` in next.config.ts — Next.js cannot trace a path
 * built at runtime, so removing that config silently falls back to the inline
 * defaults below instead of failing the build.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const cache = new Map<string, string>()

export function loadPrompt(name: string, fallback: string): string {
  const hit = cache.get(name)
  if (hit !== undefined) return hit

  let prompt = fallback
  try {
    const body = readFileSync(join(process.cwd(), 'prompts', name), 'utf8')
    const divider = body.indexOf('\n---\n')
    const text = (divider === -1 ? body : body.slice(divider + 5)).trim()
    if (text) prompt = text
  } catch {
    // A packaging mistake degrades to the inline text rather than taking
    // quoting down.
  }

  cache.set(name, prompt)
  return prompt
}
