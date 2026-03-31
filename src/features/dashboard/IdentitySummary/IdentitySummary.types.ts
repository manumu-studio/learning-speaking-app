// IdentitySummary component type definitions
export interface IdentitySummaryProps {
  weeklyMinutes: number;
  weeklySessionCount: number;
  currentFocus: string | null;
  currentStreak: number;
  /** Shown below session stats when the user has completed at least one drill */
  totalDrillsCompleted?: number;
}
