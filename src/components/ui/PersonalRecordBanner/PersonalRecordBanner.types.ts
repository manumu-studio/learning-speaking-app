// PersonalRecordBanner component type definitions
import type { PersonalRecord } from '@/lib/personalRecords.types';

export interface PersonalRecordBannerProps {
  personalRecords: PersonalRecord[];
  /** Base animation delay in ms before the first banner appears */
  animationDelay?: number;
}
