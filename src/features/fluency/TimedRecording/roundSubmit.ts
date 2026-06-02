// Standalone async helper that POSTs a completed round and parses the response
import { z } from 'zod';
import type { RoundNumber, CompletedRound } from './TimedRecording.types';

const roundResponseSchema = z.object({
  roundNumber: z.number(),
  speechRateWpm: z.number().nullable(),
  fillerCount: z.number().nullable(),
  hesitationCount: z.number().nullable(),
});

export interface SubmitRoundParams {
  fluencySessionId: string;
  currentRound: RoundNumber;
  speakingSessionId: string;
}

export async function submitRound({
  fluencySessionId,
  currentRound,
  speakingSessionId,
}: SubmitRoundParams): Promise<CompletedRound> {
  const response = await fetch(
    `/api/fluency-sessions/${fluencySessionId}/rounds`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roundNumber: currentRound, speakingSessionId }),
    },
  );

  if (!response.ok) {
    throw new Error(`Round submission failed: ${response.status}`);
  }

  const data = roundResponseSchema.parse(await response.json());

  return {
    roundNumber: currentRound,
    speechRateWpm: data.speechRateWpm,
    fillerCount: data.fillerCount,
    hesitationCount: data.hesitationCount,
  };
}
