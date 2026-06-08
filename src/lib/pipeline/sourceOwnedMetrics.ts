// Metrics whose scores come from deterministic/Azure sources, not LLM synthesis.
// Persistence must never delete or overwrite these keys with synthesis output.

export const SOURCE_OWNED_METRICS = ['speakingRate', 'fillerUsage'] as const;

export type SourceOwnedMetric = (typeof SOURCE_OWNED_METRICS)[number];

const SOURCE_OWNED_SET: ReadonlySet<string> = new Set<string>(SOURCE_OWNED_METRICS);

export function isSourceOwned(key: string): key is SourceOwnedMetric {
  return SOURCE_OWNED_SET.has(key);
}
