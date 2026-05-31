// Tests for OnboardingGuard — client-side redirect for unonboarded users
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OnboardingGuard } from './OnboardingGuard';

const mockReplace = vi.fn();
let mockPathname = '/dashboard';

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ replace: mockReplace }),
}));

describe('OnboardingGuard', () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockPathname = '/dashboard';
  });

  it('renders children when user is onboarded', () => {
    render(
      <OnboardingGuard onboardedAt="2026-01-01T00:00:00.000Z">
        <p>Dashboard content</p>
      </OnboardingGuard>,
    );
    expect(screen.getByText('Dashboard content')).toBeInTheDocument();
  });

  it('does not redirect when user is onboarded', () => {
    render(
      <OnboardingGuard onboardedAt="2026-01-01T00:00:00.000Z">
        <p>Content</p>
      </OnboardingGuard>,
    );
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('redirects to /onboarding when user is not onboarded', () => {
    render(
      <OnboardingGuard onboardedAt={null}>
        <p>Should not see</p>
      </OnboardingGuard>,
    );
    expect(mockReplace).toHaveBeenCalledWith('/onboarding');
  });

  it('renders null when not onboarded and not on onboarding page', () => {
    const { container } = render(
      <OnboardingGuard onboardedAt={null}>
        <p>Hidden</p>
      </OnboardingGuard>,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders children when not onboarded but already on onboarding page', () => {
    mockPathname = '/onboarding';
    render(
      <OnboardingGuard onboardedAt={null}>
        <p>Onboarding content</p>
      </OnboardingGuard>,
    );
    expect(screen.getByText('Onboarding content')).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('does not redirect when on onboarding sub-path', () => {
    mockPathname = '/onboarding/voice-profile';
    render(
      <OnboardingGuard onboardedAt={null}>
        <p>Voice profile</p>
      </OnboardingGuard>,
    );
    expect(screen.getByText('Voice profile')).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
