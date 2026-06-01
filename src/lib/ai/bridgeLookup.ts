// Resolves L1 tags to bridge coaching data — pure client-safe lookup
import type { L1Tag } from './l1Spanish.types';
import type { BridgeFeedback } from './bridgeRules.types';
import { BRIDGE_RULES } from './bridgeRules';

/**
 * Returns bridge coaching data for the given L1 interference tags.
 *
 * Unknown tag strings are silently filtered out — only tags present in `BRIDGE_RULES`
 * produce an output entry. Safe to call with any string array from Azure data.
 *
 * @param l1Tags - L1 interference tag strings detected by the Azure pronunciation pipeline.
 * @returns An array of `BridgeFeedback` objects (may be empty if no tags match).
 */
export function getBridgeRules(l1Tags: readonly string[]): BridgeFeedback[] {
  return l1Tags
    .filter((tag): tag is L1Tag => tag in BRIDGE_RULES)
    .map((tag) => ({ tag, rule: BRIDGE_RULES[tag] }));
}
