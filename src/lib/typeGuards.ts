// Shared runtime type-guard helpers used across lib and API modules

/** Narrows `unknown` to `Record<string, unknown>` — safe for dynamic property access. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
