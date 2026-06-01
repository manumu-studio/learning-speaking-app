// /fluency-training — landing page for 4-3-2 timed fluency training
import { redirect } from 'next/navigation';
import { auth } from '@/features/auth/auth';
import { prisma } from '@/lib/prisma';
import { findOrCreateUser } from '@/lib/db-utils';
import { Container } from '@/components/ui/Container';
import { PROMPT_LIBRARY, LIBRARY_CATEGORIES, LIBRARY_FORMATS, LIBRARY_CEFR_LEVELS } from '@/lib/prompts/promptLibrary';
import { findPromptById } from '@/lib/prompts/promptLibrary';
import { PromptLibraryView } from '@/features/prompts/PromptLibraryView';
import { FluencySessionList } from '@/features/fluency/FluencySessionList';

export const metadata = {
  title: 'Fluency Training | Learning Speaking App',
  description: 'Practice the 4-3-2 method to boost speech rate and reduce hesitations.',
};

export default async function FluencyTrainingPage() {
  const session = await auth();
  if (!session?.user?.externalId) redirect('/');

  const user = await findOrCreateUser(session.user.externalId, {
    email: session.user.email ?? undefined,
    displayName: session.user.name ?? undefined,
  });

  const pastSessions = await prisma.timedFluencySession.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { rounds: { orderBy: { roundNumber: 'asc' } } },
  });

  const serializedSessions = pastSessions.map((s) => {
    const prompt = findPromptById(s.promptId);
    return {
      id: s.id,
      promptTitle: prompt?.title ?? 'Unknown prompt',
      status: s.status,
      createdAt: s.createdAt.toISOString(),
      rounds: s.rounds.map((r) => ({
        roundNumber: r.roundNumber as 1 | 2 | 3,
        speechRateWpm: r.speechRateWpm,
      })),
    };
  });

  return (
    <Container>
      <div className="flex flex-col gap-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Fluency Training — 4-3-2 Method
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Retell the same content faster each round. Your speech rate climbs,
            hesitations drop.
          </p>
        </div>

        {/* Prompt picker */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Pick a Prompt
          </h2>
          <PromptLibraryView
            prompts={PROMPT_LIBRARY}
            categories={LIBRARY_CATEGORIES}
            formats={LIBRARY_FORMATS}
            cefrLevels={LIBRARY_CEFR_LEVELS}
            showFluencyAction
          />
        </section>

        {/* Past sessions */}
        {serializedSessions.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Past Sessions
            </h2>
            <FluencySessionList sessions={serializedSessions} />
          </section>
        )}
      </div>
    </Container>
  );
}
