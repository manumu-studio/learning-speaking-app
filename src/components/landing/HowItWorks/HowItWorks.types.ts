// HowItWorks section type definitions
export interface StepData {
  number: number;
  icon: 'mic' | 'brain' | 'bar-chart-3';
  title: string;
  description: string;
}

export interface HowItWorksProps {
  /** Optional className for the section wrapper */
  className?: string;
}
