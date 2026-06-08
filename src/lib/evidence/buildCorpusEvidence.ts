// Builds CorpusEvidenceRef from corpus tables — v1 stub, returns empty
import type { CorpusEvidenceRef } from './evidence.types';

export async function buildCorpusEvidence(
  _sessionId: string,
): Promise<CorpusEvidenceRef[]> {
  // TODO: cross-reference session vocabulary against Lexeme/Collocation tables
  return [];
}
