// Component tests for ThemeToggle — theme switch labels and setTheme calls
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeToggle } from './ThemeToggle';

const setTheme = vi.fn();

vi.mock('next-themes', () => ({
  useTheme: vi.fn(),
}));

import { useTheme } from 'next-themes';

const mockUseTheme = vi.mocked(useTheme);

describe('ThemeToggle', () => {
  beforeEach(() => {
    setTheme.mockClear();
    mockUseTheme.mockReset();
  });

  it('exposes switch-to-dark label when resolved theme is light', async () => {
    mockUseTheme.mockReturnValue({
      resolvedTheme: 'light',
      setTheme,
      theme: 'light',
      themes: [],
      systemTheme: undefined,
      forcedTheme: undefined,
    });

    render(<ThemeToggle />);

    expect(
      await screen.findByRole('button', { name: 'Switch to dark mode' }),
    ).toBeEnabled();
  });

  it('switches from light to dark when clicked after mount', async () => {
    const user = userEvent.setup();
    mockUseTheme.mockReturnValue({
      resolvedTheme: 'light',
      setTheme,
      theme: 'light',
      themes: [],
      systemTheme: undefined,
      forcedTheme: undefined,
    });

    render(<ThemeToggle />);

    const active = await waitFor(() =>
      screen.getByRole('button', { name: 'Switch to dark mode' }),
    );
    await user.click(active);
    expect(setTheme).toHaveBeenCalledWith('dark');
  });

  it('switches from dark to light when clicked', async () => {
    const user = userEvent.setup();
    mockUseTheme.mockReturnValue({
      resolvedTheme: 'dark',
      setTheme,
      theme: 'dark',
      themes: [],
      systemTheme: undefined,
      forcedTheme: undefined,
    });

    render(<ThemeToggle />);

    const active = await waitFor(() =>
      screen.getByRole('button', { name: 'Switch to light mode' }),
    );
    await user.click(active);
    expect(setTheme).toHaveBeenCalledWith('light');
  });
});
