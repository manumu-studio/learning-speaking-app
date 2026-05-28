// Settings read and update API — GET returns current settings, PATCH updates fields
import { auth } from '@/features/auth/auth';
import { prisma } from '@/lib/prisma';
import { errorResponse, successResponse } from '@/lib/api';
import { log } from '@/lib/logger';
import { validateOrigin, csrfForbiddenResponse } from '@/lib/csrf';
import { z } from 'zod';

const PatchSettingsSchema = z.object({
  dailyGoalMinutes: z.number().int().min(1).max(120).optional(),
  defaultDurationSecs: z
    .number()
    .int()
    .refine((v) => [30, 60, 120, 300].includes(v), {
      message: 'defaultDurationSecs must be 30, 60, 120, or 300',
    })
    .optional(),
  pronunciationEnabled: z.boolean().optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
  phonemeAlphabet: z.enum(['IPA', 'SAPI']).optional(),
});

/**
 * GET /api/settings
 * Return current user settings (upserts defaults if none exist)
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.externalId) {
      return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const user = await prisma.user.findUnique({
      where: { externalId: session.user.externalId },
    });

    if (!user) {
      return errorResponse('User not found', 'NOT_FOUND', 404);
    }

    const settings = await prisma.userSettings.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id },
    });

    return successResponse(settings);
  } catch (error) {
    log({
      level: 'error',
      message: 'Settings read failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return errorResponse('Failed to read settings', 'INTERNAL_ERROR', 500);
  }
}

/**
 * PATCH /api/settings
 * Update one or more user settings fields
 */
export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.externalId) {
      return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);
    }

    if (!validateOrigin(request)) {
      return csrfForbiddenResponse();
    }

    const user = await prisma.user.findUnique({
      where: { externalId: session.user.externalId },
    });

    if (!user) {
      return errorResponse('User not found', 'NOT_FOUND', 404);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse('Invalid JSON body', 'VALIDATION_ERROR', 400);
    }

    const parsed = PatchSettingsSchema.safeParse(body);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]?.message ?? 'Invalid input';
      return errorResponse(firstIssue, 'VALIDATION_ERROR', 400);
    }

    // Strip undefined keys so exactOptionalPropertyTypes is satisfied
    const fields: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(parsed.data)) {
      if (val !== undefined) fields[key] = val;
    }

    if (Object.keys(fields).length === 0) {
      return errorResponse('No fields to update', 'VALIDATION_ERROR', 400);
    }

    const updated = await prisma.userSettings.upsert({
      where: { userId: user.id },
      update: fields,
      create: { userId: user.id, ...fields },
    });

    return successResponse(updated);
  } catch (error) {
    log({
      level: 'error',
      message: 'Settings update failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return errorResponse('Failed to update settings', 'INTERNAL_ERROR', 500);
  }
}
