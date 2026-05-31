// Props for VocabSuggestions — words to add from session analysis
export interface VocabSuggestion {
  word: string;
  meaning: string;
  exampleSentence: string;
}

export interface VocabSuggestionsProps {
  suggestions: VocabSuggestion[];
  animationDelay?: number;
}
