// /prompts — browsable prompt library page (Server Component)
import { PromptLibraryView } from '@/features/prompts/PromptLibraryView';
import { Container } from '@/components/ui/Container';
import { PROMPT_LIBRARY, LIBRARY_CATEGORIES } from '@/lib/prompts/promptLibrary';

export const metadata = {
  title: 'Speaking Prompts | Learning Speaking App',
  description: 'Browse guided speaking topics and start a coached session.',
};

export default function PromptsPage() {
  return (
    <Container>
      <PromptLibraryView prompts={PROMPT_LIBRARY} categories={LIBRARY_CATEGORIES} />
    </Container>
  );
}
