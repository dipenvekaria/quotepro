/**
 * Prompt Loader Utility
 * 
 * Load AI prompts from the /prompts directory and replace variables.
 * 
 * Usage:
 * ```typescript
 * import { loadPrompt } from '@/lib/prompts'
 * 
 * const prompt = loadPrompt('quote-generation/main', {
 *   customer_name: 'John Doe',
 *   customer_address: '123 Main St',
 *   description: 'Install new HVAC system'
 * })
 * ```
 */

import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * Load a prompt template from the prompts directory
 * 
 * @param promptPath - Path relative to /prompts directory (without .md extension)
 * @param variables - Object with variable replacements
 * @returns Processed prompt string with variables replaced
 */
export function loadPrompt(
  promptPath: string,
  variables: Record<string, string | number> = {}
): string {
  const fullPath = join(process.cwd(), 'prompts', `${promptPath}.md`)
  
  try {
    let content = readFileSync(fullPath, 'utf-8')
    
    // Replace variables in format {{variable_name}}
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g')
      content = content.replace(regex, String(value))
    }
    
    return content
  } catch (error) {
    console.error(`Failed to load prompt: ${promptPath}`, error)
    throw new Error(`Prompt not found: ${promptPath}`)
  }
}

/**
 * Load multiple prompts and combine them
 * 
 * @param promptPaths - Array of prompt paths
 * @param variables - Object with variable replacements
 * @param separator - String to join prompts (default: double newline)
 * @returns Combined prompt string
 */
export function loadPrompts(
  promptPaths: string[],
  variables: Record<string, string | number> = {},
  separator: string = '\n\n'
): string {
  return promptPaths
    .map(path => loadPrompt(path, variables))
    .join(separator)
}

/**
 * Get the system prompt (common instructions)
 * 
 * @param variables - Optional variable replacements
 * @returns System prompt string
 */
export function getSystemPrompt(
  variables: Record<string, string | number> = {}
): string {
  return loadPrompt('common/system', variables)
}
