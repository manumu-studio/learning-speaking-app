// Scans transcript text for active language bank items using case-insensitive matching

interface ScanItem {
  id: string;
  text: string;
  lemmaOrPattern: string | null;
}

interface ScanResult {
  itemId: string;
  matchCount: number;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function scanTranscriptForUsage(transcript: string, items: ScanItem[]): ScanResult[] {
  const results: ScanResult[] = [];

  for (const item of items) {
    const pattern = item.lemmaOrPattern ?? item.text;
    const regex = new RegExp('\\b' + escapeRegex(pattern) + '\\b', 'gi');
    const matches = transcript.match(regex);
    const matchCount = matches?.length ?? 0;

    if (matchCount > 0) {
      results.push({ itemId: item.id, matchCount });
    }
  }

  return results;
}
