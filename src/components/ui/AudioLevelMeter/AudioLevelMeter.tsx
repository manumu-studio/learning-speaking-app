// Real-time vertical audio level meter with clipping and quiet warnings
'use client';

import { useAudioLevelMeter } from './useAudioLevelMeter';
import type { AudioLevelMeterProps } from './AudioLevelMeter.types';

export function AudioLevelMeter({ stream, isActive, className }: AudioLevelMeterProps) {
  const { level, warning } = useAudioLevelMeter({ stream, isActive });
  const fillHeight = `${Math.min(100, Math.round(level * 100))}%`;

  return (
    <div
      className={`flex flex-col items-center gap-2 ${className ?? ''}`}
      aria-live="polite"
      aria-label="Microphone level"
    >
      <div className="relative h-24 w-4 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden border border-gray-300 dark:border-gray-600">
        <div
          className={`absolute bottom-0 left-0 right-0 transition-all duration-75 ${
            warning === 'clipping'
              ? 'bg-red-500'
              : warning === 'too_quiet'
                ? 'bg-amber-400'
                : 'bg-emerald-500'
          }`}
          style={{ height: fillHeight }}
        />
      </div>
      {warning === 'clipping' && (
        <p className="text-xs text-red-600 dark:text-red-400 font-medium">Too loud — move back</p>
      )}
      {warning === 'too_quiet' && (
        <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">Too quiet — speak up</p>
      )}
    </div>
  );
}
