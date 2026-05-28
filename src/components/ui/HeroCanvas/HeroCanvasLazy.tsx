// Lazy-loaded HeroCanvas wrapper — dynamic import with SSR disabled for landing page
'use client';

import dynamic from 'next/dynamic';

export const HeroCanvasLazy = dynamic(
  () => import('./HeroCanvas').then((m) => m.HeroCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 w-full h-full bg-black" aria-hidden="true" />
    ),
  },
);
