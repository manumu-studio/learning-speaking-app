// Sanitises user content before injection into AI prompt templates
/** Strips or escapes characters that could inject unwanted content into AI prompt templates. */
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
