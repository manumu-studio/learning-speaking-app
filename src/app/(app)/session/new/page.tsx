// New recording session page with full recording UI
'use client';

import { Container } from '@/components/ui/Container';
import { RecordingPanel } from '@/features/recording/RecordingPanel';

export default function NewSessionPage() {
  const handleUpload = async (blob: Blob, durationSecs: number) => {
    console.log('Upload triggered:', {
      size: blob.size,
      type: blob.type,
      duration: durationSecs,
    });
    // Placeholder for PACKET-06 implementation
    alert('Upload functionality will be implemented in PACKET-06');
  };

  return (
    <Container>
      <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
        New Speaking Session
      </h1>
      <RecordingPanel onUpload={handleUpload} />
    </Container>
  );
}
