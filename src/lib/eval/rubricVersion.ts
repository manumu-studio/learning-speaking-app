// rubricVersion.ts - single source of truth for the active human-rating rubric version;
// consumed by label.ts (scripts/eval) and must match GoldenLabel.rubricVersion in the DB.

export const RUBRIC_VERSION = 'v1' as const;
export type RubricVersion = typeof RUBRIC_VERSION;
