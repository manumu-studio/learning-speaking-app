// Filters and annotates Whisper segments by confidence before coaching analysis
import type { WhisperSegment } from '@/lib/ai/whisper.types';
import type { AnnotatedSegment, AnnotatedTranscript } from '@/lib/ai/confidenceGating.types';

export const NO_SPEECH_THRESHOLD = 0.6;
export const SILENCE_LOGPROB_THRESHOLD = -1.0;
export const COMPRESSION_RATIO_THRESHOLD = 2.4;
export const LOW_CONFIDENCE_LOGPROB_THRESHOLD = -0.8;

const SUSPECT_OPEN = '⟨?';
const SUSPECT_CLOSE = '?⟩';

function trimSegmentText(text: string): string {
  return text.trim();
}

function isSilenceSegment(segment: WhisperSegment): boolean {
  return (
    segment.no_speech_prob > NO_SPEECH_THRESHOLD &&
    segment.avg_logprob < SILENCE_LOGPROB_THRESHOLD
  );
}

function isRepetitionLoop(segment: WhisperSegment): boolean {
  return segment.compression_ratio > COMPRESSION_RATIO_THRESHOLD;
}

function isLowConfidence(segment: WhisperSegment): boolean {
  return segment.avg_logprob < LOW_CONFIDENCE_LOGPROB_THRESHOLD;
}

function wrapSuspect(text: string): string {
  const trimmed = trimSegmentText(text);
  if (trimmed.length === 0) {
    return '';
  }
  return `${SUSPECT_OPEN}${trimmed}${SUSPECT_CLOSE}`;
}

function classifySegment(segment: WhisperSegment): AnnotatedSegment {
  const rawText = trimSegmentText(segment.text);

  if (isSilenceSegment(segment)) {
    return {
      text: '',
      suspect: true,
      reason: 'silence',
      source: segment,
    };
  }

  if (isRepetitionLoop(segment)) {
    return {
      text: wrapSuspect(rawText),
      suspect: true,
      reason: 'repetition-loop',
      source: segment,
    };
  }

  if (isLowConfidence(segment)) {
    return {
      text: wrapSuspect(rawText),
      suspect: true,
      reason: 'low-confidence',
      source: segment,
    };
  }

  return {
    text: rawText,
    suspect: false,
    source: segment,
  };
}

function joinSegmentTexts(parts: string[]): string {
  return parts.filter((part) => part.length > 0).join(' ').replace(/\s+/g, ' ').trim();
}

/** Classifies Whisper segments by confidence, dropping silence and wrapping low-confidence text in suspect markers. */
export function gateSegments(segments: WhisperSegment[]): AnnotatedTranscript {
  if (segments.length === 0) {
    return {
      cleanText: '',
      annotatedText: '',
      segments: [],
      stats: {
        totalSegments: 0,
        droppedSegments: 0,
        suspectSegments: 0,
        cleanSegments: 0,
      },
    };
  }

  const annotatedSegments = segments.map(classifySegment);

  let droppedSegments = 0;
  let suspectSegments = 0;
  let cleanSegments = 0;

  const cleanParts: string[] = [];
  const annotatedParts: string[] = [];

  for (const segment of annotatedSegments) {
    if (segment.reason === 'silence') {
      droppedSegments += 1;
      continue;
    }

    if (segment.suspect) {
      suspectSegments += 1;
      if (segment.text.length > 0) {
        annotatedParts.push(segment.text);
      }
      continue;
    }

    cleanSegments += 1;
    if (segment.text.length > 0) {
      cleanParts.push(segment.text);
      annotatedParts.push(segment.text);
    }
  }

  return {
    cleanText: joinSegmentTexts(cleanParts),
    annotatedText: joinSegmentTexts(annotatedParts),
    segments: annotatedSegments,
    stats: {
      totalSegments: segments.length,
      droppedSegments,
      suspectSegments,
      cleanSegments,
    },
  };
}
