// FeatureShowcase section type definitions
export interface FeatureCardData {
  icon: 'mic' | 'brain' | 'trending-up';
  title: string;
  description: string;
}

export interface FeatureShowcaseProps {
  /** Optional className for the section wrapper */
  className?: string;
}
