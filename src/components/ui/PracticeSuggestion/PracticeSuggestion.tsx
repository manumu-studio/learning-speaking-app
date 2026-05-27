// PracticeSuggestion: shows a targeted tongue twister or drill phrase based on weak phonemes or error types
'use client';

import React, { useState } from 'react';
import type { PracticeSuggestionProps, Exercise } from './PracticeSuggestion.types';
import type { PronunciationReport } from '@/components/ui/PronunciationSection';

const EXERCISE_MAP: Record<string, Exercise> = {
  th: {
    title: "Tongue twister — 'th' sound",
    phrase: 'The thirty-three thieves thought that they thrilled the throne throughout Thursday.',
    rationale: "Place your tongue lightly between your teeth for 'th' — not a 'd' or 't'.",
  },
  r: {
    title: "Drill — American 'r'",
    phrase: 'Red lorry, yellow lorry. The rural ruler rarely ruled fairly.',
    rationale: "Curl the tip of your tongue back slightly — don't let it touch the roof of your mouth.",
  },
  v: {
    title: "Drill — 'v' vs 'b'",
    phrase: 'Very brave Vera volunteered to verify every valid value.',
    rationale: "For 'v', your top teeth touch your lower lip. For 'b', both lips press together.",
  },
  w: {
    title: "Drill — 'w' onset",
    phrase: 'Whether the weather be fine, or whether the weather be not.',
    rationale: "Round your lips before starting — 'w' needs lip-rounding from the first sound.",
  },
  l: {
    title: "Drill — clear 'l'",
    phrase: 'Lily loves lemon lollipops. Lola looked lovely in a lavender top.',
    rationale: "Touch the tip of your tongue to the ridge just behind your top teeth for 'l'.",
  },
  UnexpectedBreak: {
    title: 'Fluency drill — no pauses',
    phrase: 'I went to the store, bought some bread, came back home, and made a sandwich.',
    rationale: 'Read this sentence aloud in one smooth breath — pause only at the comma.',
  },
  MissingBreak: {
    title: 'Rhythm drill — natural pauses',
    phrase: 'When you wake up in the morning, / take a deep breath, / and think about your day.',
    rationale: 'Pause at each slash. Natural pauses at phrase boundaries make speech easier to follow.',
  },
  MonotonePitch: {
    title: 'Intonation drill — question vs statement',
    phrase: "She's coming. / She's coming? / She's coming! / Really? / Yes, really.",
    rationale: 'Your pitch should rise on questions and fall at the end of statements.',
  },
  fluency: {
    title: 'Fluency warm-up',
    phrase: 'Peter Piper picked a peck of pickled peppers.',
    rationale: 'Repeat this three times, gradually increasing speed each time.',
  },
  default: {
    title: 'General pronunciation warm-up',
    phrase: 'How much wood would a woodchuck chuck if a woodchuck could chuck wood?',
    rationale: 'A classic warm-up. Focus on clear consonants and a steady rhythm.',
  },
};

const DEFAULT_EXERCISE = EXERCISE_MAP['default'];
const FLUENCY_EXERCISE = EXERCISE_MAP['fluency'];

function selectExercise(pronunciationReport: PronunciationReport): Exercise {
  const errorTypes = pronunciationReport.words
    .map((w) => w.errorType)
    .filter((e) => e !== 'None' && e !== 'Omission');

  for (const errorType of errorTypes) {
    const exercise = EXERCISE_MAP[errorType];
    if (exercise !== undefined) return exercise;
  }

  if (pronunciationReport.fluencyScore < 60 && FLUENCY_EXERCISE !== undefined) {
    return FLUENCY_EXERCISE;
  }

  return DEFAULT_EXERCISE ?? {
    title: 'General pronunciation warm-up',
    phrase: 'How much wood would a woodchuck chuck if a woodchuck could chuck wood?',
    rationale: 'A classic warm-up. Focus on clear consonants and a steady rhythm.',
  };
}

export function PracticeSuggestion({
  pronunciationReport,
  animationDelay,
}: PracticeSuggestionProps): React.JSX.Element {
  const exercise = selectExercise(pronunciationReport);
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    void navigator.clipboard.writeText(exercise.phrase).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <section
      className="opacity-0 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-5 space-y-3"
      style={{
        animation: 'fadeInUp 0.5s ease-out forwards',
        animationDelay: `${animationDelay}ms`,
      }}
      aria-labelledby="practice-heading"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3
          id="practice-heading"
          className="text-sm font-semibold text-purple-900 dark:text-purple-200 uppercase tracking-wide"
        >
          Practice now
        </h3>
        <span className="text-xs text-purple-700 dark:text-purple-400">{exercise.title}</span>
      </div>

      <div className="relative bg-white dark:bg-gray-800 rounded-lg p-4 pr-14 border border-purple-100 dark:border-purple-800">
        <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed font-medium italic">
          &ldquo;{exercise.phrase}&rdquo;
        </p>
        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? 'Copied' : 'Copy phrase'}
          className="absolute top-2 right-2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          {copied ? '✓' : 'Copy'}
        </button>
      </div>

      <p className="text-xs text-purple-800 dark:text-purple-300 leading-snug">
        {exercise.rationale}
      </p>
    </section>
  );
}
