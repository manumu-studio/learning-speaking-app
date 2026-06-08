// Transcript components for day detail — pronunciation map, reading view, and token rendering
'use client';

import { useState } from 'react';
import { PhonemeDetail } from '@/components/ui/PhonemeDetail';
import type { WordPronunciation } from '@/components/ui/PronunciationSection';
import type {
  DayTranscriptMode,
  DayTranscriptSession,
  DayTranscriptToken,
} from '@/lib/daily/dayDetail/buildDayDetailData.types';

const SCORE_BAND_STYLES = {
  green: 'text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30',
  amber: 'text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/30',
  red: 'text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30',
  grayItalic: 'italic text-gray-400 hover:bg-gray-50 dark:text-gray-500 dark:hover:bg-gray-800',
} satisfies Record<string, string>;

function toWordPronunciation(token: DayTranscriptToken): WordPronunciation | null {
  if (token.pronunciation === null) return null;
  return {
    word: token.text,
    display: token.pronunciation.display,
    accuracyScore: token.pronunciation.accuracyScore,
    errorType: token.pronunciation.errorType,
    offsetMs: token.pronunciation.offsetMs,
    durationMs: token.pronunciation.durationMs,
    phonemes: token.pronunciation.phonemes,
    l1Tags: token.pronunciation.l1Tags,
    breakErrorTypes: token.pronunciation.breakErrorTypes,
    intonationErrorTypes: token.pronunciation.intonationErrorTypes,
    monotonePitchDelta: token.pronunciation.monotonePitchDelta,
  };
}

export function TranscriptMapTabs({ transcriptSessions }: { transcriptSessions: readonly DayTranscriptSession[] }) {
  const [activeTab, setActiveTab] = useState<'map' | 'improved'>('map');
  return (
    <div className="mt-3">
      <div className="flex gap-1 rounded-lg bg-gray-100 p-0.5 dark:bg-gray-800" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'map'}
          className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${activeTab === 'map' ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
          onClick={() => setActiveTab('map')}
        >
          Transcript Map
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'improved'}
          className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${activeTab === 'improved' ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
          onClick={() => setActiveTab('improved')}
        >
          Improved Version
        </button>
      </div>
      <div className="mt-2 space-y-3">
        {transcriptSessions.map((session) => (
          <TranscriptMapSession key={session.sessionId} session={session} modeKind={activeTab === 'map' ? 'pronunciationMap' : 'improved'} />
        ))}
      </div>
    </div>
  );
}

function TranscriptMapSession({ session, modeKind = 'pronunciationMap' }: { session: DayTranscriptSession; modeKind?: DayTranscriptMode['kind'] }) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const mode = session.modes.find((m) => m.kind === modeKind) ?? session.modes[0];
  if (mode === undefined) return null;
  return (
    <div className="rounded-lg border border-gray-100 p-3 dark:border-gray-800">
      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{session.title}</p>
      <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">{session.topic}</p>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700 dark:text-gray-300">
        {mode.tokens.map((token, index) => {
          const word = toWordPronunciation(token);
          if (word === null) return <span key={`${token.text}-${index}`}>{token.text}</span>;
          const band = token.pronunciation?.scoreBand ?? 'green';
          const colorClass = SCORE_BAND_STYLES[band];
          return (
            <button key={`${token.text}-${index}`} type="button" className={`rounded px-0.5 ${colorClass}`} onClick={() => setExpandedIndex(index)}>
              {token.text}
            </button>
          );
        })}
      </p>
      {expandedIndex !== null && mode.tokens[expandedIndex] !== undefined && (
        <div className="mt-3">
          <PhonemeDetail word={toWordPronunciation(mode.tokens[expandedIndex]) ?? {
            word: '',
            accuracyScore: 0,
            errorType: 'None',
            offsetMs: 0,
            durationMs: 0,
            phonemes: [],
            l1Tags: [],
            breakErrorTypes: [],
            intonationErrorTypes: [],
            monotonePitchDelta: null,
          }} onClose={() => setExpandedIndex(null)} />
        </div>
      )}
    </div>
  );
}

