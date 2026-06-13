// Pronunciation token map — colour-coded word-level accuracy with phoneme drill-down
'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { PhonemeDetail } from '@/components/ui/PhonemeDetail';
import type { WordPronunciation } from '@/components/ui/PronunciationSection';

// ---------------------------------------------------------------------------
// Token utilities
// ---------------------------------------------------------------------------

const TOKEN_PATTERN = /(\r\n|\n|\s+|[\p{L}\p{N}'-]+|[^\s\p{L}\p{N}'-]+)/gu;

function normalizeWord(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}'-]/gu, '');
}

interface PronunciationToken {
  readonly text: string;
  readonly word: WordPronunciation | null;
}

function buildPronunciationTokens(text: string, words: readonly WordPronunciation[]): PronunciationToken[] {
  const tokens = text.match(TOKEN_PATTERN) ?? [];
  const aligned = new Map<number, WordPronunciation>();
  let pronCursor = 0;
  const MAX_SCAN = 15;

  for (let i = 0; i < tokens.length && pronCursor < words.length; i += 1) {
    const normalized = normalizeWord(tokens[i] ?? '');
    if (normalized.length === 0) continue;
    for (let scan = 0; scan < MAX_SCAN && pronCursor + scan < words.length; scan += 1) {
      const candidate = words[pronCursor + scan];
      if (candidate !== undefined && normalizeWord(candidate.display ?? candidate.word) === normalized) {
        aligned.set(i, candidate);
        pronCursor = pronCursor + scan + 1;
        break;
      }
    }
  }

  return tokens.map((token, index) => ({
    text: token,
    word: aligned.get(index) ?? null,
  }));
}

// ---------------------------------------------------------------------------
// Score band styles
// ---------------------------------------------------------------------------

const SCORE_BAND_STYLES: Record<string, string> = {
  green: 'text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30',
  amber: 'text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/30',
  red: 'text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30',
  grayItalic: 'italic text-gray-400 hover:bg-gray-50 dark:text-gray-500 dark:hover:bg-gray-800',
};

function scoreBandFor(word: WordPronunciation): string {
  const score = word.accuracyScore;
  if (score >= 80) return 'green';
  if (score >= 50) return 'amber';
  return 'red';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PronunciationMap({
  text,
  words,
}: {
  text: string;
  words: WordPronunciation[];
}) {
  const [expandedWord, setExpandedWord] = useState<WordPronunciation | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const tokens = useMemo(() => buildPronunciationTokens(text, words), [text, words]);

  const handleWordClick = useCallback((word: WordPronunciation) => {
    setExpandedWord(word);
    requestAnimationFrame(() => {
      detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }, []);

  return (
    <div className="space-y-3">
      <p className="whitespace-pre-wrap">
        {tokens.map((token, index) => {
          if (token.word === null) {
            return <span key={`${token.text}-${index}`}>{token.text}</span>;
          }
          const band = scoreBandFor(token.word);
          const colorClass = SCORE_BAND_STYLES[band] ?? SCORE_BAND_STYLES.green;
          return (
            <button
              key={`${token.text}-${index}`}
              type="button"
              className={`rounded px-0.5 ${colorClass}`}
              onClick={() => {
                if (token.word === null) return;
                handleWordClick(token.word);
              }}
            >
              {token.text}
            </button>
          );
        })}
      </p>
      {expandedWord !== null && (
        <div ref={detailRef}>
          <PhonemeDetail word={expandedWord} onClose={() => setExpandedWord(null)} />
        </div>
      )}
    </div>
  );
}
