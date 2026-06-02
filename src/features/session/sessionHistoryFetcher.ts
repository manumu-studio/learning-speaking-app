// Standalone fetch helper for session history pagination — used by useSessionHistory
import { z } from 'zod';

const SessionListItemSchema = z.object({
  id: z.string(),
  status: z.string(),
  intentLabel: z.string().nullable(),
  topic: z.string().nullable(),
  durationSecs: z.number().nullable(),
  wordCount: z.number().nullable(),
  createdAt: z.string(),
  overallScore: z.number().nullable(),
  pronunciationScore: z.number().nullable(),
  workoutNumber: z.number(),
});

export const SessionListResponseSchema = z.object({
  sessions: z.array(SessionListItemSchema),
  nextCursor: z.string().nullable(),
  nextCursorId: z.string().nullable(),
  total: z.number(),
});

export type SessionListResponse = z.infer<typeof SessionListResponseSchema>;

export interface FetchPageOpts {
  cursor: string | null;
  cursorId: string | null;
  dateFilter: string;
}

/** Fetches a single page of session history from the API. */
export async function fetchSessionPage(opts: FetchPageOpts): Promise<SessionListResponse> {
  const params = new URLSearchParams({
    limit: '10',
    dateFilter: opts.dateFilter,
    isOnboarding: 'false',
  });
  if (opts.cursor !== null) params.set('cursor', opts.cursor);
  if (opts.cursorId !== null) params.set('cursorId', opts.cursorId);

  const res = await fetch(`/api/sessions?${params.toString()}`);
  if (!res.ok) throw new Error(`Failed to load sessions (${res.status})`);

  return SessionListResponseSchema.parse(await res.json());
}
