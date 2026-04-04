// Zod schemas for Prisma JSON fields — runtime validation at the database boundary
import { z } from 'zod';

/** Insight.examples — array of example strings from analysis */
export const InsightExamplesSchema = z.array(z.string());

/** PatternProfile.patterns — { "category:pattern": count } map */
export const PatternProfilePatternsSchema = z.record(z.string(), z.number());

/** PatternProfile.focusAreas — array of focus area strings */
export const PatternProfileFocusAreasSchema = z.array(z.string());
