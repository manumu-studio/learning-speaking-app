// Component tests for TopBar — nav, user display, sign out control
import { axe } from '@/__mocks__/rtl-setup';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TopBar } from './TopBar';

vi.mock('next/image', () => ({
  // Test double — avoid next/image in unit tests
  default: ({ alt }: { alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element -- intentional mock
    <img alt={alt} data-testid="logo" />
  ),
}));

vi.mock('@/components/ui/MainNav', () => ({
  MainNav: () => <nav data-testid="main-nav">MainNav</nav>,
}));

vi.mock('@/components/ui/ThemeToggle', () => ({
  ThemeToggle: () => <button type="button" aria-label="Toggle theme" />,
}));

describe('TopBar', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders main navigation region', () => {
    render(<TopBar />);
    expect(screen.getByTestId('main-nav')).toBeInTheDocument();
  });

  it('shows user name and email on large screens', () => {
    render(<TopBar userName="Alex" userEmail="alex@example.com" />);
    expect(screen.getByText('Alex')).toBeInTheDocument();
    expect(screen.getByText('alex@example.com')).toBeInTheDocument();
  });

  it('navigates to federated sign out when sign out is activated', async () => {
    const user = userEvent.setup();
    let hrefValue = '';
    vi.stubGlobal(
      'location',
      Object.defineProperty({}, 'href', {
        configurable: true,
        get: () => hrefValue,
        set: (v: string) => {
          hrefValue = v;
        },
      }) as unknown as Location,
    );

    render(<TopBar userName="Alex" />);
    await user.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(hrefValue).toBe('/api/auth/federated-signout');
  });

  it('has no axe accessibility violations', async () => {
    const { container } = render(<TopBar userName="Alex" userEmail="alex@example.com" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
