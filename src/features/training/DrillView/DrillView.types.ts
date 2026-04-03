// DrillView component type definitions

/** High-level UX state for the drill screen (drives which sub-view is mounted). */
export type DrillState = 'prompt' | 'recording' | 'processing' | 'feedback';

/** Container route passes only the drill id; hook loads attempt details from the API. */
export interface DrillViewProps {
  drillId: string;
}
