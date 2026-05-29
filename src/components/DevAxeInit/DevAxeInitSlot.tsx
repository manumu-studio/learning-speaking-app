// DevAxeInitSlot — loads DevAxeInit only in development builds (tree-shaken from production)
'use client';

import dynamic from 'next/dynamic';

const DevAxeInit =
  process.env.NODE_ENV === 'development'
    ? dynamic(() => import('./DevAxeInit').then((m) => m.DevAxeInit), { ssr: false })
    : (): null => null;

export function DevAxeInitSlot() {
  return <DevAxeInit />;
}
