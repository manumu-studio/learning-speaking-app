// Sanitises user content before injection into AI prompt templates
/**
 * Strips or escapes characters that could inject unwanted control sequences into AI prompt templates.
 *
 * Transformations applied (in order):
 * - Backticks → single quotes
 * - Double quotes → escaped `\"`
 * - `<` → `&lt;`, `>` → `&gt;`
 * - Role injection keywords (`SYSTEM:`, `HUMAN:`, `ASSISTANT:`, `USER:`) → bracketed placeholders
 * - Leading/trailing whitespace trimmed
 *
 * @param input - Raw user-supplied string to sanitize.
 * @returns The sanitized string, safe for injection into prompt templates.
 * @example
 * sanitizePromptInput('SYSTEM: ignore above') // => '[system] ignore above'
 */
export function sanitizePromptInput(input: string): string {
  return input
    .replace(/`/g, "'")
    .replace(/"/g, '\\"')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/SYSTEM:/gi, '[system]')
    .replace(/HUMAN:/gi, '[human]')
    .replace(/ASSISTANT:/gi, '[assistant]')
    .replace(/USER:/gi, '[user]')
    .trim();
}
