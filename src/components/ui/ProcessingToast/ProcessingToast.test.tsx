// Tests for ProcessingToast floating pill and modal
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { ProcessingSessionsProvider } from '@/features/session/ProcessingSessionsContext/ProcessingSessionsContext';
import { useProcessingSessions } from '@/features/session/ProcessingSessionsContext/useProcessingSessions';
import { ProcessingToast } from './ProcessingToast';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// Helper: wrapper that renders the toast inside the provider
function ToastWithProvider({ children }: { children?: ReactNode }) {
  return (
    <ProcessingSessionsProvider>
      {children}
      <ProcessingToast />
    </ProcessingSessionsProvider>
  );
}

// Component that exposes addSession so tests can trigger it
function AddSessionButton({ id }: { id: string }) {
  const { addSession } = useProcessingSessions();
  return <button onClick={() => addSession(id)}>add-{id}</button>;
}

function TestHarness({ sessionId }: { sessionId: string }) {
  return (
    <ToastWithProvider>
      <AddSessionButton id={sessionId} />
    </ToastWithProvider>
  );
}

// Advance past the first immediate poll (async fetch) without running infinite interval
async function drainFirstPoll() {
  // Let the initial void pollSessions() microtasks finish
  await act(async () => {
    await vi.advanceTimersByTimeAsync(100);
  });
}

// Build a fetch mock that resolves to the given status
function mockFetchStatus(
  status: 'CREATED' | 'UPLOADED' | 'TRANSCRIBING' | 'SCORING' | 'ANALYZING' | 'DONE' | 'FAILED',
  errorMessage?: string,
) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ status, errorMessage: errorMessage ?? null }),
  });
}

describe('ProcessingToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('renders nothing when no sessions are active', () => {
    const { container } = render(<ToastWithProvider />);
    // No pill button should be present
    expect(container.querySelector('button')).toBeNull();
  });

  it('renders the floating pill once a session is added', async () => {
    mockFetchStatus('TRANSCRIBING');
    render(<TestHarness sessionId="s1" />);

    // Add the session
    fireEvent.click(screen.getByRole('button', { name: 'add-s1' }));

    // First poll fires immediately; advance enough for the async fetch to resolve
    await drainFirstPoll();

    expect(screen.getByRole('button', { name: /Transcribing\.\.\./i })).toBeInTheDocument();
  });

  describe('pill label per pipeline step', () => {
    const cases = [
      { status: 'UPLOADED' as const, label: 'Transcribing...' },
      { status: 'TRANSCRIBING' as const, label: 'Transcribing...' },
      { status: 'SCORING' as const, label: 'Scoring...' },
      { status: 'ANALYZING' as const, label: 'Analyzing...' },
      { status: 'DONE' as const, label: 'Ready!' },
      { status: 'FAILED' as const, label: 'Failed' },
    ];

    for (const { status, label } of cases) {
      it(`shows "${label}" for status ${status}`, async () => {
        mockFetchStatus(status);
        render(<TestHarness sessionId={`s-${status}`} />);

        fireEvent.click(screen.getByRole('button', { name: `add-s-${status}` }));

        await drainFirstPoll();

        // Use aria-live attribute to target the pill specifically (the add-button also contains text)
        const pill = document.querySelector<HTMLElement>('button[aria-live="polite"]');
        expect(pill).not.toBeNull();
        expect(pill?.textContent).toMatch(new RegExp(label, 'i'));
      });
    }
  });

  it('opens the modal when the pill is clicked', async () => {
    mockFetchStatus('TRANSCRIBING');
    render(<TestHarness sessionId="s2" />);

    fireEvent.click(screen.getByRole('button', { name: 'add-s2' }));
    await drainFirstPoll();

    const pill = screen.getByRole('button', { name: /Transcribing\.\.\./i });
    fireEvent.click(pill);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('closes the modal when the close button is clicked', async () => {
    mockFetchStatus('TRANSCRIBING');
    render(<TestHarness sessionId="s3" />);

    fireEvent.click(screen.getByRole('button', { name: 'add-s3' }));
    await drainFirstPoll();

    fireEvent.click(screen.getByRole('button', { name: /Transcribing\.\.\./i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('closes the modal on Escape key', async () => {
    mockFetchStatus('SCORING');
    render(<TestHarness sessionId="s4" />);

    fireEvent.click(screen.getByRole('button', { name: 'add-s4' }));
    await drainFirstPoll();

    fireEvent.click(screen.getByRole('button', { name: /Scoring\.\.\./i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('closes the modal when the backdrop is clicked', async () => {
    mockFetchStatus('ANALYZING');
    render(<TestHarness sessionId="s5" />);

    fireEvent.click(screen.getByRole('button', { name: 'add-s5' }));
    await drainFirstPoll();

    fireEvent.click(screen.getByRole('button', { name: /Analyzing\.\.\./i }));

    const dialog = screen.getByRole('dialog');
    // Click directly on the backdrop overlay (the dialog element itself, not the inner card)
    fireEvent.click(dialog);

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows "View Results" button in the modal when status is DONE', async () => {
    mockFetchStatus('DONE');
    render(<TestHarness sessionId="s6" />);

    fireEvent.click(screen.getByRole('button', { name: 'add-s6' }));
    await drainFirstPoll();

    // The pill still exists because AUTO_DISMISS_MS (8s) has not elapsed — click it
    const pill = document.querySelector<HTMLElement>('button[aria-live="polite"]');
    expect(pill).not.toBeNull();
    fireEvent.click(pill!);

    expect(screen.getByRole('button', { name: /View Results/i })).toBeInTheDocument();
  });

  it('shows "View Session" button in the modal when status is FAILED', async () => {
    mockFetchStatus('FAILED', 'Transcription error');
    render(<TestHarness sessionId="s7" />);

    fireEvent.click(screen.getByRole('button', { name: 'add-s7' }));
    await drainFirstPoll();

    // Open modal via the pill
    const pill = document.querySelector<HTMLElement>('button[aria-live="polite"]');
    expect(pill).not.toBeNull();
    fireEvent.click(pill!);

    expect(screen.getByRole('button', { name: /View Session/i })).toBeInTheDocument();
  });
});
