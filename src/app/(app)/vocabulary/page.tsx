// /vocabulary — SRS review queue and vocabulary library page
import { Container } from '@/components/ui/Container';
import { VocabTabs } from '@/features/vocabulary/VocabTabs';

export const metadata = {
  title: 'Vocabulary | Learning Speaking App',
  description: 'Review and track your vocabulary with spaced repetition.',
};

export default function VocabularyPage() {
  return (
    <Container>
      <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-gray-100">Vocabulary</h1>
      <VocabTabs />
    </Container>
  );
}
