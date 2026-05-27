// Component tests for PromptCard — tabs, shuffle, and free speak
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { PromptCard } from './PromptCard';
import { PROMPTS } from '../prompts.config';

const dailyPrompt = PROMPTS.find((p) => p.category === 'daily');
if (!dailyPrompt) {
  throw new Error('Expected at least one daily prompt in config');
}

describe('PromptCard', () => {
  it('renders prompt text', () => {
    render(
      <PromptCard
        prompt={dailyPrompt}
        activeCategory="daily"
        onShuffle={vi.fn()}
        onCategoryChange={vi.fn()}
        onFreeSpeakToggle={vi.fn()}
        isFreeSpeak={false}
      />,
    );

    expect(screen.getByText(dailyPrompt.text)).toBeInTheDocument();
  });

  it('calls onShuffle when shuffle is clicked', async () => {
    const user = userEvent.setup();
    const onShuffle = vi.fn();

    render(
      <PromptCard
        prompt={dailyPrompt}
        activeCategory="daily"
        onShuffle={onShuffle}
        onCategoryChange={vi.fn()}
        onFreeSpeakToggle={vi.fn()}
        isFreeSpeak={false}
      />,
    );

    await user.click(screen.getByRole('button', { name: /shuffle prompt/i }));
    expect(onShuffle).toHaveBeenCalledOnce();
  });

  it('shows free speak placeholder when enabled', () => {
    render(
      <PromptCard
        prompt={null}
        activeCategory="daily"
        onShuffle={vi.fn()}
        onCategoryChange={vi.fn()}
        onFreeSpeakToggle={vi.fn()}
        isFreeSpeak
      />,
    );

    expect(
      screen.getByText('Free speak — say anything you like'),
    ).toBeInTheDocument();
  });
});
