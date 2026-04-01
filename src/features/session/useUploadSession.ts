// Hook for uploading recorded audio to create a new speaking session
'use client';

import { useState } from 'react';
import { z } from 'zod';

const uploadErrorSchema = z.object({
  error: z.string(),
});

const uploadResultSchema = z.object({
  id: z.string(),
  status: z.string(),
  createdAt: z.string(),
  estimatedWaitSecs: z.number(),
});

interface UseUploadSessionReturn {
  upload: (
    blob: Blob,
    durationSecs: number,
    topic?: string,
    focus?: { focusKey: string; focusLabel: string } | null
  ) => Promise<string>;
  isUploading: boolean;
  error: string | null;
}

export function useUploadSession(): UseUploadSessionReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (
    blob: Blob,
    durationSecs: number,
    topic?: string,
    focus?: { focusKey: string; focusLabel: string } | null
  ): Promise<string> => {
    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('audio', blob, `recording.${blob.type.split('/')[1]?.split(';')[0] ?? 'webm'}`);
      formData.append('duration', durationSecs.toString());
      formData.append('language', 'en');
      if (focus) {
        formData.append('focusMetricKey', focus.focusKey);
        formData.append('topic', focus.focusLabel);
      } else if (topic) {
        formData.append('topic', topic);
      }

      const response = await fetch('/api/sessions', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = uploadErrorSchema.parse(await response.json());
        throw new Error(data.error ?? 'Upload failed');
      }

      const data = uploadResultSchema.parse(await response.json());
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
