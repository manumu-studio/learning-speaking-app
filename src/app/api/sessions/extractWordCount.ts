// Parses an optional JSON summary string to extract a stored word count
import { isRecord } from '@/lib/typeGuards';

export function extractWordCount(summary: string | null): number | null {
  if (summary === null) return null;
  try {
    const parsed: unknown = JSON.parse(summary);
    if (
      isRecord(parsed) &&
      'wordCount' in parsed &&
      typeof parsed['wordCount'] === 'number'
    ) {
      return parsed['wordCount'];
    }
    return null;
  } catch {
    return null;
  }
}
