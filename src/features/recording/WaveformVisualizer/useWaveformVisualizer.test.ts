// Tests for useWaveformVisualizer — idle heights and SSR-safe behaviour
/** @vitest-environment jsdom */
import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useWaveformVisualizer } from './useWaveformVisualizer';

describe('useWaveformVisualizer', () => {
  it('returns zero bar heights when stream is null', () => {
    const { result } = renderHook(() =>
      useWaveformVisualizer({ stream: null, barCount: 8 }),
    );

    expect(result.current.barHeights).toHaveLength(8);
    expect(result.current.barHeights.every((h) => h === 0)).toBe(true);
  });

  it('respects custom barCount', () => {
    const { result } = renderHook(() =>
      useWaveformVisualizer({ stream: null, barCount: 12 }),
    );

    expect(result.current.barHeights).toHaveLength(12);
  });
});
