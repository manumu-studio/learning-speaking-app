// Tests for usePillarCard — expand/collapse toggle
import { renderHook, act } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { usePillarCard } from './usePillarCard';

describe('usePillarCard', () => {
  it('starts collapsed', () => {
    const { result } = renderHook(() => usePillarCard('delivery'));
    expect(result.current.isExpanded).toBe(false);
  });

  it('expands on toggle', () => {
    const { result } = renderHook(() => usePillarCard('delivery'));
    act(() => result.current.toggle());
    expect(result.current.isExpanded).toBe(true);
  });

  it('collapses on second toggle', () => {
    const { result } = renderHook(() => usePillarCard('pronunciation'));
    act(() => result.current.toggle());
    act(() => result.current.toggle());
    expect(result.current.isExpanded).toBe(false);
  });
});
