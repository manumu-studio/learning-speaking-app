// Typed helper for converting validated values to Prisma's opaque InputJsonValue type.
// Uses JSON round-trip serialization to guarantee structural JSON compatibility.
import type { Prisma } from '@prisma/client';

/**
 * Converts a validated runtime value to `Prisma.InputJsonValue`.
 *
 * JSON.parse(JSON.stringify(value)) produces a plain JSON-compatible object,
 * which satisfies `Prisma.InputJsonValue` without unsafe type assertions at the call site.
 * Use this for all Prisma Json field writes — never use bare `as Prisma.InputJsonValue`.
 */
export function toInputJson(value: unknown): Prisma.InputJsonValue {
  // Round-trip serialization strips non-JSON values (undefined, functions, class instances)
  // and yields a plain object that matches Prisma's Json field requirements.
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
