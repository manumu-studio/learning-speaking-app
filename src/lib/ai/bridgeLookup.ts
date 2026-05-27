// Resolves L1 tags to bridge coaching data — pure client-safe lookup
import type { L1Tag } from './l1Spanish.types';
import type { BridgeFeedback } from './bridgeRules.types';
import { BRIDGE_RULES } from './bridgeRules';

// Returns bridge coaching data for the given L1 tags.
// Unknown tags (not in BRIDGE_RULES) are silently filtered out.
export function getBridgeRules(l1Tags: readonly string[]): BridgeFeedback[] {
  return l1Tags
    .filter((tag): tag is L1Tag => tag in BRIDGE_RULES)
    .map((tag) => ({ tag, rule: BRIDGE_RULES[tag] }));
}
