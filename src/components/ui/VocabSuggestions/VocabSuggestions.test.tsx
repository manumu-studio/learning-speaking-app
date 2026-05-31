// Tests for VocabSuggestions — rendering vocabulary upgrade suggestions
/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { VocabSuggestions } from './VocabSuggestions';
import type { VocabSuggestion } from './VocabSuggestions.types';

const mockSuggestions: VocabSuggestion[] = [
  {
    word: 'establish',
    meaning: 'A precise verb for formal contexts.',
    exampleSentence: 'We need to establish a clearer process.',
  },
  {
    word: 'articulate',
    meaning: 'To express clearly and effectively.',
    exampleSentence: 'She articulated her concerns during the meeting.',
  },
];

describe('VocabSuggestions', () => {
  it('renders nothing when suggestions array is empty', () => {
    const { container } = render(
      <VocabSuggestions suggestions={[]} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders "Words to Add" heading and all suggestion items', () => {
    render(<VocabSuggestions suggestions={mockSuggestions} />);

    expect(screen.getByText('Words to Add')).toBeInTheDocument();
    expect(screen.getByText('establish')).toBeInTheDocument();
    expect(screen.getByText('articulate')).toBeInTheDocument();
  });

  it('displays word, meaning, and example sentence for each suggestion', () => {
    render(<VocabSuggestions suggestions={mockSuggestions} />);

    expect(screen.getByText('A precise verb for formal contexts.')).toBeInTheDocument();
    expect(
      screen.getByText((_, el) =>
        el?.textContent === '“We need to establish a clearer process.”',
      ),
    ).toBeInTheDocument();
  });

  it('renders the correct number of list items', () => {
    render(<VocabSuggestions suggestions={mockSuggestions} />);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
  });
});
