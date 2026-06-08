// Language and Pronunciation feedback sub-sections for the session done view
'use client';

import { CollapsibleSection } from '@/components/ui/CollapsibleSection';
import { TranscriptToggle } from '@/components/ui/TranscriptToggle';
import {
  PronunciationSection,
} from '@/components/ui/PronunciationSection';
import { ProsodyPanel } from '@/components/ui/ProsodyPanel';
import { ProsodyFeedback } from '@/components/ui/ProsodyFeedback';
import { PronunciationProgress } from '@/components/ui/PronunciationProgress';
import { PhonemePatterns } from '@/components/ui/PhonemePatterns';
import { PrioritySounds } from '@/components/ui/PrioritySounds';
import { AccentPolish } from '@/components/ui/AccentPolish';
import { aggregatePhonemes } from '@/lib/pronunciation/aggregatePhonemes';
import { rankByFunctionalLoad, splitByPriority } from '@/lib/pronunciation/rankByFunctionalLoad';
import type { HistoryItem } from '@/components/ui/PronunciationProgress';
import { PracticeSuggestion } from '@/components/ui/PracticeSuggestion';
import { PitchContour } from '@/components/ui/PitchContour';
import type { PitchContourState } from '@/components/ui/PitchContour';
import type { SessionDetail } from '@/features/session/useSessionStatus.types';
import type { PronunciationReport } from '@/components/ui/PronunciationSection';
import { RegisterFeedback } from '@/features/session/RegisterFeedback';
import { NaturalnessInsights } from '@/features/session/NaturalnessInsights';
import { CategoryInsightsSection, groupInsightsByCategory } from './CategoryInsightsSection';
import { GrammarSection } from './GrammarSection';

interface LanguageFeedbackSectionProps {
  session: SessionDetail;
}

export function LanguageFeedbackSection({
  session,
}: LanguageFeedbackSectionProps) {
  const grouped = groupInsightsByCategory(session.insights);

  return (
    <CollapsibleSection title="Speech Quality" count={session.insights.length} animationDelay={200}>
      <div className="flex flex-col gap-4">
        <CategoryInsightsSection title="Grammar" insights={grouped.grammar} baseDelay={220} />
        {session.grammarFlags && session.grammarFlags.length > 0 && (
          <GrammarSection flags={session.grammarFlags} animationDelay={250} />
        )}
        <CategoryInsightsSection title="Vocabulary" insights={grouped.vocabulary} baseDelay={280} />
        <CategoryInsightsSection title="Structure" insights={grouped.structure} baseDelay={340} />
        {session.registerFeedback && (
          <CollapsibleSection title="Register & Pragmatics" animationDelay={460}>
            <RegisterFeedback
              register={session.registerFeedback.register}
              appropriateness={session.registerFeedback.appropriateness}
              hedgingLevel={session.registerFeedback.hedgingLevel}
              directnessLevel={session.registerFeedback.directnessLevel}
              suggestions={session.registerFeedback.suggestions}
              note={session.registerFeedback.note}
            />
          </CollapsibleSection>
        )}
        {session.naturalness && session.naturalness.length > 0 && (
          <NaturalnessInsights
            flags={session.naturalness}
            animationDelay={480}
            onFeedback={async (flagId, feedback) => {
              await fetch(`/api/naturalness/${flagId}/feedback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ feedback }),
              });
            }}
          />
        )}
      </div>
    </CollapsibleSection>
  );
}

interface PronunciationFeedbackSectionProps {
  session: SessionDetail;
  pronunciationReport: PronunciationReport;
  pronunciationHistory: HistoryItem[];
  pitchState: PitchContourState;
  pronunciationSectionDelay: number;
  prosodyPanelDelay: number;
  showTranscript?: boolean;
}

export function PronunciationFeedbackSection({
  session,
  pronunciationReport,
  pronunciationHistory,
  pitchState,
  pronunciationSectionDelay,
  prosodyPanelDelay,
  showTranscript = true,
}: PronunciationFeedbackSectionProps) {
  const { priority, polish } = splitByPriority(rankByFunctionalLoad(pronunciationReport.words));

  return (
    <CollapsibleSection title="Pronunciation & Intonation" defaultOpen animationDelay={pronunciationSectionDelay}>
      <div className="space-y-4">
        <ScoreSummaryGroup
          session={session}
          pronunciationReport={pronunciationReport}
          pronunciationHistory={pronunciationHistory}
          pronunciationSectionDelay={pronunciationSectionDelay}
          showTranscript={showTranscript}
          priority={priority}
        />
        <RhythmIntonationGroup
          session={session}
          pronunciationReport={pronunciationReport}
          pronunciationHistory={pronunciationHistory}
          pitchState={pitchState}
          prosodyPanelDelay={prosodyPanelDelay}
          pronunciationSectionDelay={pronunciationSectionDelay}
          polish={polish}
        />
      </div>
    </CollapsibleSection>
  );
}

function ScoreSummaryGroup({
  session, pronunciationReport, pronunciationHistory,
  pronunciationSectionDelay, showTranscript, priority,
}: Pick<PronunciationFeedbackSectionProps, 'session' | 'pronunciationReport' | 'pronunciationHistory' | 'pronunciationSectionDelay' | 'showTranscript'> & {
  priority: ReturnType<typeof splitByPriority>['priority'];
}) {
  return (
    <CollapsibleSection title="Score Summary" defaultOpen={false}>
      <div className="space-y-4">
        <PronunciationSection
          pronunciationReport={pronunciationReport}
          animationDelay={pronunciationSectionDelay}
          {...(pronunciationHistory.length >= 2
            ? {
                progressChip: {
                  metricLabel: 'Fluency',
                  deltaPercent: Math.round(
                    (pronunciationHistory[pronunciationHistory.length - 1]?.fluencyScore ?? 0) -
                      (pronunciationHistory[pronunciationHistory.length - 2]?.fluencyScore ?? 0),
                  ),
                },
              }
            : {})}
        />
        {showTranscript && session.transcript && (
          <TranscriptToggle
            originalText={session.transcript.text}
            improvedText={session.transcript.improvedText}
            wordsUsed={session.transcript.wordsUsed}
            wordCount={session.transcript.wordCount}
            pronunciationWords={pronunciationReport.words}
            animationDelay={pronunciationSectionDelay + 20}
            verbatimText={session.verbatimTranscript ?? undefined}
            verbatimWordCount={session.verbatimWordCount ?? undefined}
            divergenceSpans={session.divergenceSpans ?? undefined}
            verbatimProvider={session.verbatimProvider ?? undefined}
          />
        )}
        <PhonemePatterns
          phonemes={aggregatePhonemes(pronunciationReport.words)}
          animationDelay={pronunciationSectionDelay + 50}
        />
        <PrioritySounds errors={priority} animationDelay={pronunciationSectionDelay + 30} />
      </div>
    </CollapsibleSection>
  );
}

function RhythmIntonationGroup({
  session, pronunciationReport, pronunciationHistory, pitchState,
  prosodyPanelDelay, pronunciationSectionDelay, polish,
}: Pick<PronunciationFeedbackSectionProps, 'session' | 'pronunciationReport' | 'pronunciationHistory' | 'pitchState' | 'prosodyPanelDelay' | 'pronunciationSectionDelay'> & {
  polish: ReturnType<typeof splitByPriority>['polish'];
}) {
  return (
    <CollapsibleSection title="Rhythm & Intonation" defaultOpen={false}>
      <div className="space-y-4">
        <ProsodyFeedback
          words={pronunciationReport.words}
          prosodyScore={pronunciationReport.prosodyScore}
          animationDelay={prosodyPanelDelay + 50}
        />
        <ProsodyPanel
          words={pronunciationReport.words}
          speakingRateWpm={pronunciationReport.speakingRateWpm}
          prosodyScore={pronunciationReport.prosodyScore}
          animationDelay={prosodyPanelDelay}
        />
        {pitchState.status === 'ready' && 'contour' in pitchState && (
          <PitchContour contour={pitchState.contour} animationDelay={pronunciationSectionDelay + 50} />
        )}
        <PracticeSuggestion
          pronunciationReport={pronunciationReport}
          animationDelay={prosodyPanelDelay + 200}
        />
        <AccentPolish errors={polish} animationDelay={prosodyPanelDelay + 250} />
        <PronunciationProgress
          currentSessionId={session.id}
          history={pronunciationHistory}
          animationDelay={prosodyPanelDelay + 300}
        />
      </div>
    </CollapsibleSection>
  );
}

export function TranscriptOnlySection({
  session,
  transcriptDelay,
}: {
  session: SessionDetail;
  transcriptDelay: number;
}) {
  if (!session.transcript) return null;

  return (
    <CollapsibleSection title="Pronunciation & Intonation" animationDelay={transcriptDelay}>
      <TranscriptToggle
        originalText={session.transcript.text}
        improvedText={session.transcript.improvedText}
        wordsUsed={session.transcript.wordsUsed}
        wordCount={session.transcript.wordCount}
        pronunciationWords={session.pronunciationReport?.words ?? []}
        animationDelay={transcriptDelay}
        verbatimText={session.verbatimTranscript ?? undefined}
        verbatimWordCount={session.verbatimWordCount ?? undefined}
        divergenceSpans={session.divergenceSpans ?? undefined}
        verbatimProvider={session.verbatimProvider ?? undefined}
      />
    </CollapsibleSection>
  );
}
