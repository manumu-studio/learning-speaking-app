// Tests for usePhonemeAlphabet localStorage-persisted IPA/SAPI toggle
/** @vitest-environment jsdom */

import { describe, expect, it, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { usePhonemeAlphabet } from './usePhonemeAlphabet';

const STORAGE_KEY = 'lsa-phoneme-alphabet';

describe('usePhonemeAlphabet', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to ipa on first render', () => {
    const { result } = renderHook(() => usePhonemeAlphabet());
    expect(result.current.alphabet).toBe('ipa');
  });

  it('toggleAlphabet switches ipa to sapi and back', () => {
    const { result } = renderHook(() => usePhonemeAlphabet());

    act(() => {
      result.current.toggleAlphabet();
    });
    expect(result.current.alphabet).toBe('sapi');

    act(() => {
      result.current.toggleAlphabet();
    });
    expect(result.current.alphabet).toBe('ipa');
  });

  it("displayPhoneme('eh') returns 'ɛ' when alphabet is ipa", () => {
    const { result } = renderHook(() => usePhonemeAlphabet());
    expect(result.current.displayPhoneme('eh')).toBe('ɛ');
  });

  it("displayPhoneme('eh') returns 'eh' when alphabet is sapi", () => {
    const { result } = renderHook(() => usePhonemeAlphabet());

    act(() => {
      result.current.toggleAlphabet();
    });

    expect(result.current.displayPhoneme('eh')).toBe('eh');
  });

  it('persists toggle to localStorage under lsa-phoneme-alphabet', () => {
    const { result } = renderHook(() => usePhonemeAlphabet());

    act(() => {
      result.current.toggleAlphabet();
    });

    expect(localStorage.getItem(STORAGE_KEY)).toBe('sapi');
  });

  it('hydrates sapi preference from localStorage on mount', async () => {
    localStorage.setItem(STORAGE_KEY, 'sapi');
    const { result } = renderHook(() => usePhonemeAlphabet());

    await waitFor(() => {
      expect(result.current.alphabet).toBe('sapi');
    });
  });
});
