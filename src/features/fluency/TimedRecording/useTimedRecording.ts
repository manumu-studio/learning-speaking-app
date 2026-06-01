// Hook managing timer state, round progression, and round completion for 4-3-2 fluency training
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { z } from 'zod';
import type { RoundNumber, CompletedRound } from './TimedRecording.types';

/** Maps each round to its target duration in seconds */
const ROUND_TARGET_SECONDS: Record<RoundNumber, number> = {
  1: 240,
  2: 180,
  3: 120,
};

const GRACE_PERIOD_SECS = 5;

const roundResponseSchema = z.object({
  roundNumber: z.number(),
  speechRateWpm: z.number().nullable(),
  fillerCount: z.number().nullable(),
  hesitationCount: z.number().nullable(),
});

interface UseTimedRecordingOptions {
  fluencySessionId: string;
  initialRounds: CompletedRound[];
  onAllRoundsComplete: () => void;
}

interface UseTimedRecordingReturn {
  currentRound: RoundNumber;
  targetSeconds: number;
  timeRemaining: number;
  isActive: boolean;
  isGracePeriod: boolean;
  isProcessing: boolean;
  roundResults: CompletedRound[];
  start: () => void;
  stop: () => void;
  completeRound: (speakingSessionId: string) => Promise<void>;
}

export function useTimedRecording({
  fluencySessionId,
  initialRounds,
  onAllRoundsComplete,
}: UseTimedRecordingOptions): UseTimedRecordingReturn {
  const nextRound = (initialRounds.length + 1) as RoundNumber;
  const startingRound: RoundNumber = nextRound > 3 ? 3 : nextRound;

  const [currentRound, setCurrentRound] = useState<RoundNumber>(startingRound);
  const [timeRemaining, setTimeRemaining] = useState(ROUND_TARGET_SECONDS[startingRound]);
  const [isActive, setIsActive] = useState(false);
  const [isGracePeriod, setIsGracePeriod] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [roundResults, setRoundResults] = useState<CompletedRound[]>(initialRounds);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Countdown timer with grace period — lets speakers finish their thought
  useEffect(() => {
    if (!isActive) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= -GRACE_PERIOD_SECS) {
          setIsActive(false);
          setIsGracePeriod(false);
          return 0;
        }
        if (prev <= 0) {
          setIsGracePeriod(true);
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive]);

  const start = useCallback(() => {
    setTimeRemaining(ROUND_TARGET_SECONDS[currentRound]);
    setIsGracePeriod(false);
    setIsActive(true);
  }, [currentRound]);

  const stop = useCallback(() => {
    setIsActive(false);
    setIsGracePeriod(false);
  }, []);

  const completeRound = useCallback(
    async (speakingSessionId: string) => {
      setIsProcessing(true);

      try {
        const response = await fetch(
          `/api/fluency-sessions/${fluencySessionId}/rounds`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              roundNumber: currentRound,
              speakingSessionId,
            }),
          },
        );

        if (!response.ok) {
          throw new Error(`Round submission failed: ${response.status}`);
        }

        const data = roundResponseSchema.parse(await response.json());

        const completed: CompletedRound = {
          roundNumber: currentRound,
          speechRateWpm: data.speechRateWpm,
          fillerCount: data.fillerCount,
          hesitationCount: data.hesitationCount,
        };

        setRoundResults((prev) => [...prev, completed]);

        if (currentRound === 3) {
          onAllRoundsComplete();
        } else {
          const next = (currentRound + 1) as RoundNumber;
          setCurrentRound(next);
          setTimeRemaining(ROUND_TARGET_SECONDS[next]);
        }
      } finally {
        setIsProcessing(false);
      }
    },
    [currentRound, fluencySessionId, onAllRoundsComplete],
  );

  const targetSeconds = ROUND_TARGET_SECONDS[currentRound];

  return {
    currentRound,
    targetSeconds,
    timeRemaining: Math.max(0, timeRemaining),
    isActive,
    isGracePeriod,
    isProcessing,
    roundResults,
    start,
    stop,
    completeRound,
  };
}
