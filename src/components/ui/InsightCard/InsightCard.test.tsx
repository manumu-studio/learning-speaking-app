// Component tests for InsightCard — badges, body copy, examples, suggestion
import { axe } from '@/__mocks__/rtl-setup';
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

  it('does not render severity badge (removed per No-Red system)', () => {
    render(<InsightCard {...baseProps} />);
    expect(screen.queryByText('medium')).not.toBeInTheDocument();
  });

  it('lists examples and suggestion when provided', () => {
    render(<InsightCard {...baseProps} />);
    expect(screen.getByText(/I have car/)).toBeInTheDocument();
    expect(screen.getByText(/Use a\/an before/)).toBeInTheDocument();
    expect(screen.getByText(/Appeared ~3 times/)).toBeInTheDocument();
  });

  it('renders grammar mistakes in you-said arrow format', () => {
    render(
      <InsightCard
        {...baseProps}
        examples={['I was very capable to do → I was very able to do']}
        suggestion="Use able before an infinitive, not capable to."
      />,
    );
    expect(screen.getByText(/You said:/)).toBeInTheDocument();
    expect(screen.getByText(/I was very capable to do/)).toBeInTheDocument();
    expect(screen.getByText(/I was very able to do/)).toBeInTheDocument();
    expect(screen.getByText(/Use able before an infinitive/)).toBeInTheDocument();
  });

  it('has no axe accessibility violations', async () => {
    const { container } = render(<InsightCard {...baseProps} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
