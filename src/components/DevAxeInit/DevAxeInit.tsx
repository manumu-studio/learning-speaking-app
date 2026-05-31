// DevAxeInit — dev-only axe-core runtime accessibility checker (never ships to production)
'use client';

import { useEffect } from 'react';
import type { DevAxeInitProps } from './DevAxeInit.types';

export function DevAxeInit(_props: DevAxeInitProps): null {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    void import('@axe-core/react').then((axeModule) => {
      // Dynamic require is intentional — these are guaranteed to exist in the React runtime
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const React = require('react') as typeof import('react');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const ReactDOM = require('react-dom') as typeof import('react-dom');
      void axeModule.default(React, ReactDOM, 1000);
    });
  }, []);

  return null;
}
