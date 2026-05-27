// Curated speaking prompts grouped by category and difficulty

export type PromptCategory = 'daily' | 'interview' | 'academic' | 'storytelling';
export type PromptDifficulty = 'beginner' | 'intermediate' | 'advanced';

export interface SpeakingPrompt {
  readonly id: string;
  readonly category: PromptCategory;
  readonly difficulty: PromptDifficulty;
  readonly text: string;
  readonly durationHint: number;
}

export const PROMPT_CATEGORIES: readonly PromptCategory[] = [
  'daily',
  'interview',
  'academic',
  'storytelling',
] as const;

export const PROMPTS = [
  {
    id: 'daily-morning-routine',
    category: 'daily',
    difficulty: 'beginner',
    text: 'Describe what you did this morning from the moment you woke up.',
    durationHint: 60,
  },
  {
    id: 'daily-memorable-meal',
    category: 'daily',
    difficulty: 'beginner',
    text: 'Talk about a meal you really enjoyed recently and why it was memorable.',
    durationHint: 60,
  },
  {
    id: 'daily-evening-routine',
    category: 'daily',
    difficulty: 'intermediate',
    text: 'What is your evening routine? Walk me through it step by step.',
    durationHint: 90,
  },
  {
    id: 'daily-weekend-plans',
    category: 'daily',
    difficulty: 'intermediate',
    text: 'How do you usually spend your weekends? Compare a typical weekend to your ideal one.',
    durationHint: 90,
  },
  {
    id: 'daily-work-life-balance',
    category: 'daily',
    difficulty: 'advanced',
    text: 'How do you balance work, rest, and personal projects in a typical week?',
    durationHint: 120,
  },
  {
    id: 'interview-intro',
    category: 'interview',
    difficulty: 'beginner',
    text: 'Tell me about yourself and your professional background.',
    durationHint: 90,
  },
  {
    id: 'interview-challenging-project',
    category: 'interview',
    difficulty: 'intermediate',
    text: 'Describe a challenging project you worked on and what you learned from it.',
    durationHint: 120,
  },
  {
    id: 'interview-five-year-vision',
    category: 'interview',
    difficulty: 'intermediate',
    text: 'Where do you see yourself professionally in five years?',
    durationHint: 90,
  },
  {
    id: 'interview-strengths-weaknesses',
    category: 'interview',
    difficulty: 'advanced',
    text: 'What are your greatest professional strengths, and how do you manage your main weakness?',
    durationHint: 120,
  },
  {
    id: 'interview-conflict-resolution',
    category: 'interview',
    difficulty: 'advanced',
    text: 'Describe a time you disagreed with a colleague and how you resolved it.',
    durationHint: 120,
  },
  {
    id: 'academic-correlation-causation',
    category: 'academic',
    difficulty: 'beginner',
    text: 'Explain the difference between correlation and causation with an example.',
    durationHint: 90,
  },
  {
    id: 'academic-tech-trend',
    category: 'academic',
    difficulty: 'intermediate',
    text: 'Describe a technology trend that you think will be significant in the next decade.',
    durationHint: 120,
  },
  {
    id: 'academic-remote-work',
    category: 'academic',
    difficulty: 'intermediate',
    text: 'Argue for or against remote work as the default mode for software teams.',
    durationHint: 120,
  },
  {
    id: 'academic-climate-policy',
    category: 'academic',
    difficulty: 'advanced',
    text: 'Summarise one climate policy you support and the trade-offs it involves.',
    durationHint: 120,
  },
  {
    id: 'academic-ai-ethics',
    category: 'academic',
    difficulty: 'advanced',
    text: 'What ethical concern about AI in education worries you most, and why?',
    durationHint: 120,
  },
  {
    id: 'storytelling-interesting-place',
    category: 'storytelling',
    difficulty: 'beginner',
    text: 'Tell me about the most interesting place you have ever visited.',
    durationHint: 90,
  },
  {
    id: 'storytelling-difficult-decision',
    category: 'storytelling',
    difficulty: 'intermediate',
    text: 'Describe a moment when you had to make a difficult decision.',
    durationHint: 120,
  },
  {
    id: 'storytelling-teaching-moment',
    category: 'storytelling',
    difficulty: 'intermediate',
    text: 'Tell me about a time you taught someone something new.',
    durationHint: 90,
  },
  {
    id: 'storytelling-surprise-event',
    category: 'storytelling',
    difficulty: 'advanced',
    text: 'Recount an event that surprised you and how your perspective changed afterward.',
    durationHint: 120,
  },
  {
    id: 'storytelling-childhood-memory',
    category: 'storytelling',
    difficulty: 'advanced',
    text: 'Share a vivid childhood memory and explain why it still matters to you today.',
    durationHint: 120,
  },
] as const satisfies readonly SpeakingPrompt[];

export function getPromptsByCategory(category: PromptCategory): SpeakingPrompt[] {
  return PROMPTS.filter((prompt) => prompt.category === category);
}

export function pickRandomPrompt(
  category: PromptCategory,
  excludeId?: string,
): SpeakingPrompt {
  const pool = getPromptsByCategory(category).filter((p) => p.id !== excludeId);
  const candidates = pool.length > 0 ? pool : getPromptsByCategory(category);
  const index = Math.floor(Math.random() * candidates.length);
  return candidates[index] ?? candidates[0] ?? PROMPTS[0];
}
