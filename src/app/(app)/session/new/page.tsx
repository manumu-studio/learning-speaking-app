// New recording session page with full recording and upload flow
'use client';

import { Container } from '@/components/ui/Container';
import { RecordingPanel } from '@/features/recording/RecordingPanel';

export default function NewSessionPage() {
  return (
    <Container>
      <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
        New Speaking Session
      </h1>
      <RecordingPanel />
    </Container>
  );
}
