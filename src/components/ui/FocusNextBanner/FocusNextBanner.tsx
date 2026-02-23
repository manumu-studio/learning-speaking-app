// Indigo callout banner highlighting what the user should focus on next
import type { FocusNextBannerProps } from './FocusNextBanner.types';

export function FocusNextBanner({ focusNext, animationDelay }: FocusNextBannerProps) {
  const style = animationDelay !== undefined ? { animationDelay: `${animationDelay}ms` } : undefined;

  return (
    <div
      className="rounded-xl bg-indigo-50 border border-indigo-200 p-5"
      style={style}
    >
      <div className="flex items-center gap-2 mb-2">
        <span aria-hidden="true">🎯</span>
        <h3 className="text-sm font-semibold text-indigo-900 uppercase tracking-wide">
          Focus for next session
        </h3>
      </div>
      <p className="text-indigo-800 text-base leading-relaxed">{focusNext}</p>
    </div>
  );
}
