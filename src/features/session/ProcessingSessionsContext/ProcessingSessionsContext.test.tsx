// Tests for ProcessingSessionsContext provider and useProcessingSessions hook
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { ProcessingSessionsProvider } from './ProcessingSessionsContext';
import { useProcessingSessions } from './useProcessingSessions';

function wrapper({ children }: { children: ReactNode }) {
  return <ProcessingSessionsProvider>{children}</ProcessingSessionsProvider>;
}

describe('ProcessingSessionsProvider', () => {
  it('starts with an empty sessions array', () => {
    const { result } = renderHook(() => useProcessingSessions(), { wrapper });
    expect(result.current.sessions).toEqual([]);
  });

  it('addSession adds an entry with the correct id and a numeric addedAt', () => {
    const { result } = renderHook(() => useProcessingSessions(), { wrapper });

    act(() => {
      result.current.addSession('session-1');
    });

    expect(result.current.sessions).toHaveLength(1);
    expect(result.current.sessions[0]?.id).toBe('session-1');
    expect(typeof result.current.sessions[0]?.addedAt).toBe('number');
  });

  it('addSession deduplicates by id — calling twice yields one entry', () => {
    const { result } = renderHook(() => useProcessingSessions(), { wrapper });

    act(() => {
      result.current.addSession('session-dup');
      result.current.addSession('session-dup');
    });

    expect(result.current.sessions).toHaveLength(1);
    expect(result.current.sessions[0]?.id).toBe('session-dup');
  });

  it('addSession appends distinct sessions in order', () => {
    const { result } = renderHook(() => useProcessingSessions(), { wrapper });

    act(() => {
      result.current.addSession('a');
      result.current.addSession('b');
    });

    expect(result.current.sessions.map((s) => s.id)).toEqual(['a', 'b']);
  });

  it('removeSession removes the matching entry', () => {
    const { result } = renderHook(() => useProcessingSessions(), { wrapper });

    act(() => {
      result.current.addSession('to-remove');
      result.current.addSession('keep');
    });

    act(() => {
      result.current.removeSession('to-remove');
    });

    expect(result.current.sessions).toHaveLength(1);
    expect(result.current.sessions[0]?.id).toBe('keep');
  });

  it('removeSession with an unknown id does not change state', () => {
    const { result } = renderHook(() => useProcessingSessions(), { wrapper });

    act(() => {
      result.current.addSession('only');
    });

    act(() => {
      result.current.removeSession('ghost');
    });

    expect(result.current.sessions).toHaveLength(1);
  });
});

describe('useProcessingSessions', () => {
  it('throws when used outside ProcessingSessionsProvider', () => {
    // Suppress React's expected console.error for this test
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(() => renderHook(() => useProcessingSessions())).toThrow(
      'useProcessingSessions must be used within ProcessingSessionsProvider',
    );

    spy.mockRestore();
  });
});
