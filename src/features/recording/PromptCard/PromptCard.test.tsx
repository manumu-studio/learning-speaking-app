// Component tests for PromptCard dropdown selector
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
  it('renders pill with category label and prompt text', () => {
    render(
      <PromptCard
        prompt={dailyPrompt}
        activeCategory="daily"
        onCategoryChange={vi.fn()}
        onFreeSpeakToggle={vi.fn()}
        isFreeSpeak={false}
      />,
    );

    expect(screen.getByRole('button', { name: /select prompt category/i })).toBeInTheDocument();
    expect(screen.getByText('Daily')).toBeInTheDocument();
  });

  it('opens dropdown with categories on click', async () => {
    const user = userEvent.setup();
    const onCategoryChange = vi.fn();

    render(
      <PromptCard
        prompt={dailyPrompt}
        activeCategory="daily"
        onCategoryChange={onCategoryChange}
        onFreeSpeakToggle={vi.fn()}
        isFreeSpeak={false}
      />,
    );

    await user.click(screen.getByRole('button', { name: /select prompt category/i }));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getByText('Everyday topics and routines')).toBeInTheDocument();
    expect(screen.getByText('Professional scenarios')).toBeInTheDocument();

    await user.click(screen.getByText('Interview'));
    expect(onCategoryChange).toHaveBeenCalledWith('interview');
  });

  it('shows free speak as selected when enabled', () => {
    render(
      <PromptCard
        prompt={null}
        activeCategory="daily"
        onCategoryChange={vi.fn()}
        onFreeSpeakToggle={vi.fn()}
        isFreeSpeak
      />,
    );

    expect(screen.getByText('Free speak')).toBeInTheDocument();
    expect(screen.getByText(/no topic constraints/i)).toBeInTheDocument();
  });
});
