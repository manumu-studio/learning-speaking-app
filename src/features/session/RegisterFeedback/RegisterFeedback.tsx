// Register & Pragmatics feedback — classification badges, hedging indicators, coaching suggestions
import type { RegisterFeedbackProps } from './RegisterFeedback.types';

const REGISTER_COLORS: Record<string, string> = {
  formal: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  neutral: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
  informal: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
};

const APPROPRIATENESS_COLORS: Record<string, string> = {
  appropriate: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  'slightly-off': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  mismatch: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
};

const LABEL_MAP: Record<string, string> = {
  'adequate': 'Adequate',
  'under-hedged': 'Under-hedged',
  'over-hedged': 'Over-hedged',
  'appropriately-direct': 'Appropriately Direct',
  'too-direct': 'Too Direct',
  'too-indirect': 'Too Indirect',
};

export function RegisterFeedback({
  register,
  appropriateness,
  hedgingLevel,
  directnessLevel,
  suggestions,
  note,
}: RegisterFeedbackProps) {
  return (
    <div className="space-y-4">
      {/* Classification badges */}
      <div className="flex flex-wrap gap-2">
        <Badge label={register} colorMap={REGISTER_COLORS} prefix="Register" />
        <Badge label={appropriateness} colorMap={APPROPRIATENESS_COLORS} prefix="Match" />
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
          Hedging: {LABEL_MAP[hedgingLevel] ?? hedgingLevel}
        </span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
          {LABEL_MAP[directnessLevel] ?? directnessLevel}
        </span>
      </div>

      {/* Coaching note */}
      {note && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
          <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            {note}
          </p>
        </div>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Suggestions
          </h4>
          {suggestions.map((suggestion, i) => (
            <div
              key={i}
              className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
            >
              <p className="text-sm text-slate-500 dark:text-slate-400">
                &ldquo;{suggestion.original}&rdquo;
              </p>
              <p className="mt-1.5 text-sm font-medium text-slate-800 dark:text-slate-200">
                Try: &ldquo;{suggestion.alternative}&rdquo;
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {suggestion.issue}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Badge({
  label,
  colorMap,
  prefix,
}: {
  label: string;
  colorMap: Record<string, string>;
  prefix: string;
}) {
  const color = colorMap[label] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
  const displayLabel = label.charAt(0).toUpperCase() + label.slice(1).replace(/-/g, ' ');
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${color}`}>
      {prefix}: {displayLabel}
    </span>
  );
}
