// Hook managing timer state, round progression, and round completion for 4-3-2 fluency training
'use client';

import { useState, useCallback } from 'react';
import type { RoundNumber, CompletedRound } from './TimedRecording.types';
import { submitRound } from './roundSubmit';
import { useCountdownTimer } from './useCountdownTimer';

/** Maps each round to its target duration in seconds */
const ROUND_TARGET_SECONDS: Record<RoundNumber, number> = {
  1: 240,
  2: 180,
  3: 120,
};

interface UseTimedRecordingOptions {
  fluencySessionId: string;
  initialRounds: CompletedRound[];
  onAllRoundsComplete: () => void;
}

export interface UseTimedRecordingReturn {
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

/** Derives the starting round from already-completed rounds */
function deriveStartingRound(initialRounds: CompletedRound[]): RoundNumber {
  const raw = initialRounds.length + 1;
  if (raw >= 3) return 3;
  if (raw === 2) return 2;
  return 1;
}

export function useTimedRecording({
  fluencySessionId,
  initialRounds,
  onAllRoundsComplete,
}: UseTimedRecordingOptions): UseTimedRecordingReturn {
  const startingRound = deriveStartingRound(initialRounds);

  const [currentRound, setCurrentRound] = useState<RoundNumber>(startingRound);
  const [timeRemaining, setTimeRemaining] = useState(ROUND_TARGET_SECONDS[startingRound]);
  const [isActive, setIsActive] = useState(false);
  const [isGracePeriod, setIsGracePeriod] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [roundResults, setRoundResults] = useState<CompletedRound[]>(initialRounds);

  useCountdownTimer({ isActive, setTimeRemaining, setIsActive, setIsGracePeriod });

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
        const completed = await submitRound({ fluencySessionId, currentRound, speakingSessionId });
        setRoundResults((prev) => [...prev, completed]);
        if (currentRound === 3) {
          onAllRoundsComplete();
        } else {
          const next: RoundNumber = currentRound === 1 ? 2 : 3;
          setCurrentRound(next);
          setTimeRemaining(ROUND_TARGET_SECONDS[next]);
        }
      } finally {
        setIsProcessing(false);
      }
    },
    [currentRound, fluencySessionId, onAllRoundsComplete],
  );

  return {
    currentRound,
    targetSeconds: ROUND_TARGET_SECONDS[currentRound],
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
