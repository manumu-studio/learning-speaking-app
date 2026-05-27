// API route — accepts pronunciation assessment data and returns Claude-generated coaching tips
import { auth } from '@/features/auth/auth';
import { errorResponse, successResponse } from '@/lib/api';
import { generatePronunciationTips } from '@/lib/ai/pronunciationTips';
import { z } from 'zod';

const RequestBodySchema = z.object({
  pronScore: z.number().min(0).max(100),
  accuracyScore: z.number().min(0).max(100),
  fluencyScore: z.number().min(0).max(100),
  completenessScore: z.number().min(0).max(100),
  prosodyScore: z.number().min(0).max(100),
  speakingRateWpm: z.number().min(0),
  weakWords: z
    .array(
      z.object({
        word: z.string(),
        accuracyScore: z.number().min(0).max(100),
        errorType: z.string(),
      })
    )
    .max(10),
  topWeakPhonemes: z.array(z.string()).max(5),
  l1Tags: z.array(z.string()).max(10),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.externalId) {
      return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const body: unknown = await request.json();
    const parsed = RequestBodySchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Invalid request body', 'BAD_REQUEST', 400);
    }

    const tips = await generatePronunciationTips(parsed.data);
    return successResponse({ tips });
  } catch {
    return errorResponse('Failed to generate tips', 'INTERNAL_ERROR', 500);
  }
}
