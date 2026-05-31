// Page transition wrapper — re-renders on every navigation to trigger entrance animation
import type { ReactNode } from 'react';

export default function AppTemplate({ children }: { children: ReactNode }) {
  return (
    <div className="animate-page-enter">
      {children}
    </div>
  );
}
