// Type definitions for the ReviewCard component

export type VocabType = 'word' | 'collocation' | 'phrase';

export type ReviewCardItem = {
  id: string;
  word: string;
  meaning: string;
  exampleSentence: string;
  type: VocabType;
  domain: string;
  frequencyBand: string;
  interval: number;
  reviewCount: number;
};

export type ReviewRatingLabel = 'again' | 'hard' | 'good' | 'easy';

export interface ReviewCardProps {
  item: ReviewCardItem;
  onRate: (id: string, rating: ReviewRatingLabel) => void;
  isSubmitting: boolean;
}
