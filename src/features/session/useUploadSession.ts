// Hook for uploading recorded audio to create a new speaking session
'use client';

import { useState } from 'react';

interface UploadResult {
  id: string;
  status: string;
  createdAt: string;
  estimatedWaitSecs: number;
}

interface UseUploadSessionReturn {
  upload: (blob: Blob, durationSecs: number, topic?: string) => Promise<string>;
  isUploading: boolean;
  error: string | null;
}

export function useUploadSession(): UseUploadSessionReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (
    blob: Blob,
    durationSecs: number,
    topic?: string
  ): Promise<string> => {
    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('audio', blob, `recording.${blob.type.split('/')[1]?.split(';')[0] ?? 'webm'}`);
      formData.append('duration', durationSecs.toString());
      formData.append('language', 'en');
      if (topic) {
        formData.append('topic', topic);
      }

      const response = await fetch('/api/sessions', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json() as { error: string };
        throw new Error(data.error ?? 'Upload failed');
      }

      const data = await response.json() as UploadResult;
      return data.id;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to upload session';
      setError(message);
      throw err;
    } finally {
      setIsUploading(false);
    }
  };

  return { upload, isUploading, error };
}
