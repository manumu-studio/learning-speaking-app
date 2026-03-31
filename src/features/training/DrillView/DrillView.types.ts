// DrillView component type definitions

export type DrillState = 'prompt' | 'recording' | 'processing' | 'feedback';

export interface DrillViewProps {
  drillId: string;
}
