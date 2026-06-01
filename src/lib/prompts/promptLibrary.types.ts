// Types for the browsable prompt library — richer than prompts.config for the grid UI

export type PromptFormat = 'opinion' | 'monologue' | 'image' | 'retell' | 'summarize' | 'impromptu';

export type LibraryCategory = 'Professional' | 'Social' | 'Academic' | 'Daily';

export type CefrLevel = 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export type PromptDuration = '30s' | '60s' | '90s' | '120s' | '180s' | '240s';

export interface LibraryPrompt {
  readonly id: string;
  readonly category: LibraryCategory;
  readonly cefrLevel: CefrLevel;
  readonly duration: PromptDuration;
  readonly format: PromptFormat;
  readonly text: string;
  readonly hint: string;
  readonly title: string;
  readonly imagePath?: string;
  readonly sourcePassage?: string;
  readonly sourceText?: string;
  readonly prepTimeSecs?: number;
}
