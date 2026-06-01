// Language and Pronunciation feedback sub-sections for the session done view
'use client';

import { CollapsibleSection } from '@/components/ui/CollapsibleSection';
import { VocabSuggestions } from '@/components/ui/VocabSuggestions';
import { FocusNextBanner } from '@/components/ui/FocusNextBanner';
import { FocusHighlight } from '@/components/ui/FocusHighlight';
import { AnnotatedTranscript } from '@/components/ui/AnnotatedTranscript';
import { TranscriptToggle } from '@/components/ui/TranscriptToggle';
import {
  PronunciationSection,
} from '@/components/ui/PronunciationSection';
import { WordColorMap } from '@/components/ui/WordColorMap';
import { ProsodyPanel } from '@/components/ui/ProsodyPanel';
import { ProsodyFeedback } from '@/components/ui/ProsodyFeedback';
import { PronunciationTipsCard } from '@/components/ui/PronunciationTipsCard';
import { PronunciationProgress } from '@/components/ui/PronunciationProgress';
import { PhonemePatterns } from '@/components/ui/PhonemePatterns';
import { aggregatePhonemes } from '@/lib/pronunciation/aggregatePhonemes';
import { VocabProgress } from '@/components/ui/VocabProgress';
import type { VocabItem } from '@/components/ui/VocabProgress';
import type { HistoryItem } from '@/components/ui/PronunciationProgress';
import { PracticeSuggestion } from '@/components/ui/PracticeSuggestion';
import { PitchContour } from '@/components/ui/PitchContour';
import type { PitchContourState } from '@/components/ui/PitchContour';
import type { SessionDetail } from '@/features/session/useSessionStatus.types';
import { DrillRecommendation } from '@/features/training/DrillRecommendation';
import type { DrillType } from '@/features/training/training.types';
import type { PronunciationReport } from '@/components/ui/PronunciationSection';
import { RegisterFeedback } from '@/features/session/RegisterFeedback';
import { CategoryInsightsSection, groupInsightsByCategory, deriveVocabSuggestions } from './CategoryInsightsSection';
import type { FocusComparison } from './sessionResults.helpers';
import { pickWeakestMetric } from './sessionResults.helpers';

interface LanguageFeedbackSectionProps {
  session: SessionDetail;
  vocabItems: VocabItem[];
  focusComparison: FocusComparison | null;
  focusHighlightDelay: number;
  focusBannerDelay: number;
  weakestSnapshot: ReturnType<typeof pickWeakestMetric>;
  drillConfig: { drillType: DrillType; timeLimit: number } | undefined;
  weakestLabel: string;
  onStartDrill: (drillType: DrillType, metricKey: string) => Promise<void>;
}

export function LanguageFeedbackSection({
  session,
  vocabItems,
  focusComparison,
  focusHighlightDelay,
  focusBannerDelay,
  weakestSnapshot,
  drillConfig,
  weakestLabel,
  onStartDrill,
}: LanguageFeedbackSectionProps) {
  const grouped = groupInsightsByCategory(session.insights);
  const vocabSuggestions = deriveVocabSuggestions(session.insights);

  return (
    <CollapsibleSection title="Language Feedback" count={session.insights.length} animationDelay={200}>
      <div className="flex flex-col gap-4">
        <CategoryInsightsSection title="Grammar" insights={grouped.grammar} baseDelay={220} />
        <CategoryInsightsSection title="Vocabulary" insights={grouped.vocabulary} baseDelay={280} />
        <CategoryInsightsSection title="Structure" insights={grouped.structure} baseDelay={340} />
        <VocabSuggestions suggestions={vocabSuggestions} animationDelay={400} />
        <VocabProgress items={vocabItems} animationDelay={450} />
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
        {focusComparison && (
          <FocusHighlight
            metricLabel={focusComparison.metricLabel}
            currentScore={focusComparison.currentScore}
            previousScore={focusComparison.previousScore}
            animationDelay={focusHighlightDelay}
          />
        )}
        {weakestSnapshot !== null && drillConfig !== undefined && (
          <DrillRecommendation
            drillType={drillConfig.drillType}
            metricLabel={weakestLabel}
            timeLimit={drillConfig.timeLimit}
            onStartDrill={() =>
              void onStartDrill(drillConfig.drillType, weakestSnapshot.key)
            }
          />
        )}
        {session.focusNext && (
          <FocusNextBanner focusNext={session.focusNext} animationDelay={focusBannerDelay} />
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
  wordColorMapDelay: number;
  prosodyPanelDelay: number;
}

export function PronunciationFeedbackSection({
  session,
  pronunciationReport,
  pronunciationHistory,
  pitchState,
  pronunciationSectionDelay,
  wordColorMapDelay,
  prosodyPanelDelay,
}: PronunciationFeedbackSectionProps) {
  return (
    <CollapsibleSection title="Pronunciation & Intonation" animationDelay={pronunciationSectionDelay}>
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
        <PhonemePatterns
          phonemes={aggregatePhonemes(pronunciationReport.words)}
          animationDelay={pronunciationSectionDelay + 50}
        />
        <CollapsibleSection title="Word Color Map" defaultOpen={false}>
          <WordColorMap words={pronunciationReport.words} animationDelay={wordColorMapDelay} />
        </CollapsibleSection>
        <CollapsibleSection title="Prosody Feedback" defaultOpen={false}>
          <ProsodyFeedback
            words={pronunciationReport.words}
            prosodyScore={pronunciationReport.prosodyScore}
            animationDelay={wordColorMapDelay + 50}
          />
        </CollapsibleSection>
        <ProsodyPanel
          words={pronunciationReport.words}
          speakingRateWpm={pronunciationReport.speakingRateWpm}
          prosodyScore={pronunciationReport.prosodyScore}
          animationDelay={prosodyPanelDelay}
        />
        {pitchState.status === 'ready' && 'contour' in pitchState && (
          <CollapsibleSection title="Pitch Contour" defaultOpen={false}>
            <PitchContour contour={pitchState.contour} animationDelay={pronunciationSectionDelay + 50} />
          </CollapsibleSection>
        )}
        <CollapsibleSection title="Pronunciation Tips" defaultOpen={false}>
          <PronunciationTipsCard
            pronunciationReport={pronunciationReport}
            animationDelay={prosodyPanelDelay + 100}
          />
        </CollapsibleSection>
        <CollapsibleSection title="Practice Suggestion" defaultOpen={false}>
          <PracticeSuggestion
            pronunciationReport={pronunciationReport}
            animationDelay={prosodyPanelDelay + 200}
          />
        </CollapsibleSection>
        <CollapsibleSection title="Pronunciation Progress" defaultOpen={false}>
          <PronunciationProgress
            currentSessionId={session.id}
            history={pronunciationHistory}
            animationDelay={prosodyPanelDelay + 300}
          />
        </CollapsibleSection>
      </div>
    </CollapsibleSection>
  );
}

export function TranscriptSection({
  session,
  transcriptDelay,
}: {
  session: SessionDetail;
  transcriptDelay: number;
}) {
  if (!session.transcript) return null;

  return (
    <CollapsibleSection title="Annotated Transcript" defaultOpen={false} animationDelay={transcriptDelay}>
      {session.transcript.improvedText && session.transcript.wordsUsed.length > 0 ? (
        <TranscriptToggle
          originalText={session.transcript.text}
          improvedText={session.transcript.improvedText}
          wordsUsed={session.transcript.wordsUsed}
          wordCount={session.transcript.wordCount}
          animationDelay={transcriptDelay}
        />
      ) : (
        <AnnotatedTranscript
          text={session.transcript.text}
          wordCount={session.transcript.wordCount}
          insights={session.insights}
          metrics={session.metrics ?? []}
          animationDelay={transcriptDelay}
          embedded
        />
      )}
    </CollapsibleSection>
  );
}
