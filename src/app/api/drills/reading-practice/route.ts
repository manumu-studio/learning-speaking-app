// API route: generate a reading practice text targeting user's weak phonemes and vocabulary

import { auth } from '@/features/auth/auth';
import { errorResponse, successResponse } from '@/lib/api';
import { withObservability } from '@/lib/observability';
import { validateOrigin, csrfForbiddenResponse } from '@/lib/csrf';
import { generateReadingPractice } from '@/lib/ai/generateReadingPractice';
import type pino from 'pino';
import { z } from 'zod';

const RequestBodySchema = z.object({
  weakPhonemes: z.array(z.string()).max(10).default([]),
  weakVocabulary: z.array(z.string()).max(10).default([]),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
});

async function postHandler(req: Request, { logger: _logger }: { logger: pino.Logger; requestId: string }) {
  if (!validateOrigin(req)) return csrfForbiddenResponse();

  const authSession = await auth();
  if (!authSession?.user?.externalId) {
    return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);
  }

  const raw: unknown = await req.json();
  const parsed = RequestBodySchema.safeParse(raw);
  if (!parsed.success) {
    return errorResponse('Invalid request body', 'VALIDATION_ERROR', 400);
  }

  try {
    const result = await generateReadingPractice(parsed.data);
    return successResponse(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse(message, 'AI_ERROR', 500);
  }
}

export const POST = withObservability(postHandler, { route: 'drills/reading-practice' });
