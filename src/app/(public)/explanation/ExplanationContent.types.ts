// Types for the ExplanationContent component and its sub-components

export type Language = 'en' | 'es';

/** Resolved copy object for a single language, passed to sub-components */
export interface PageCopy {
  privatePreview: string;
  welcome: string;
  byInvitation: string;
  oneOfFiveLabel: string;
  chosenFor: (name: string) => string;
  exclusivityBody1: string;
  exclusivityBody2: string;
  gatheringTitle: string;
  gatheringBody1: string;
  gatheringBody2: string;
  introducing: string;
  appTitle: string;
  appBody: string;
  feature1: string;
  feature2: string;
  feature3: string;
  feature4: string;
  whatToExpect: string;
  expectBody1: string;
  expectBody2: string;
  closing: string;
  date: string;
  footer: string;
  scroll: string;
}

export interface ExplanationHeroProps {
  guestName: string;
  copy: PageCopy;
}

export interface ExplanationScrollSectionsProps {
  guestName: string;
  copy: PageCopy;
}
