// Component tests for InsightCard — badges, body copy, examples, suggestion
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { InsightCard } from './InsightCard';

const baseProps = {
  category: 'grammar',
  pattern: 'Article usage',
  detail: 'Missing articles before countable nouns.',
  frequency: 3,
  severity: 'medium' as const,
  examples: ['I have car', 'She is teacher'] as string[] | null,
  suggestion: 'Use a/an before singular count nouns.',
};

describe('InsightCard', () => {
  it('renders category, pattern, and detail', () => {
    render(<InsightCard {...baseProps} />);
    expect(screen.getByText('grammar')).toBeInTheDocument();
    expect(screen.getByText('Article usage')).toBeInTheDocument();
    expect(screen.getByText(/Missing articles/)).toBeInTheDocument();
  });

  it('renders severity badge when severity is set', () => {
    render(<InsightCard {...baseProps} />);
    expect(screen.getByText('medium')).toBeInTheDocument();
  });

  it('lists examples and suggestion when provided', () => {
    render(<InsightCard {...baseProps} />);
    expect(screen.getByText(/I have car/)).toBeInTheDocument();
    expect(screen.getByText(/Use a\/an before/)).toBeInTheDocument();
    expect(screen.getByText(/Appeared ~3 times/)).toBeInTheDocument();
  });
});
