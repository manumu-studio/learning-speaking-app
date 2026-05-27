// Tests for RecordingContext UI and useRecordingContext hook
import { render, screen, renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RecordingContext } from './RecordingContext';
import { useRecordingContext } from './useRecordingContext';

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

describe('RecordingContext', () => {
  it('renders nothing while loading', () => {
    const { container } = render(
      <RecordingContext
        todaySessionCount={2}
        nextRecordingNumber={3}
        isLoading
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders recording count and history link', () => {
    render(
      <RecordingContext
        todaySessionCount={2}
        nextRecordingNumber={3}
        isLoading={false}
      />,
    );

    expect(screen.getByText(/recording/i)).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view recent/i })).toHaveAttribute(
      'href',
      '/history',
    );
  });

  it('renders nothing when there are no sessions today', () => {
    const { container } = render(
      <RecordingContext
        todaySessionCount={0}
        nextRecordingNumber={1}
        isLoading={false}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

describe('useRecordingContext', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('counts sessions created today from the API', async () => {
    const today = new Date().toISOString();

    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({
        sessions: [
          { id: 'a', createdAt: today },
          { id: 'b', createdAt: today },
          { id: 'c', createdAt: '2020-01-01T12:00:00.000Z' },
        ],
        total: 3,
        page: 1,
        limit: 10,
      }),
    );

    const { result } = renderHook(() => useRecordingContext());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.todaySessionCount).toBe(2);
    expect(result.current.nextRecordingNumber).toBe(3);
  });
});
