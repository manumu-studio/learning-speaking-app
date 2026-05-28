// Types for the browsable prompt library — richer than prompts.config for the grid UI

export type LibraryCategory = 'Professional' | 'Social' | 'Academic' | 'Daily';

export type CefrLevel = 'A2' | 'B1' | 'B2' | 'C1';

export type PromptDuration = '30s' | '60s' | '90s' | '120s';

export interface LibraryPrompt {
  readonly id: string;
  readonly category: LibraryCategory;
  readonly cefrLevel: CefrLevel;
  readonly duration: PromptDuration;
  readonly text: string;
  readonly hint: string;
  readonly title: string;
}
