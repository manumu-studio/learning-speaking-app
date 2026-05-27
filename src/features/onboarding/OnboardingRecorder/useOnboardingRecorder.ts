// Hook managing upload logic for the onboarding recording
'use client';

import { useState } from 'react';
import { z } from 'zod';

const uploadErrorSchema = z.object({ error: z.string() });
const uploadResultSchema = z.object({
  id: z.string(),
  status: z.string(),
  createdAt: z.string(),
  estimatedWaitSecs: z.number(),
});

const ONBOARDING_TOPIC =
  "Tell us about your favorite travel destination — real or imaginary. Why do you love it?";

interface UseOnboardingRecorderReturn {
  upload: (blob: Blob, durationSecs: number) => Promise<string>;
  isUploading: boolean;
  error: string | null;
}

export function useOnboardingRecorder(): UseOnboardingRecorderReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (blob: Blob, durationSecs: number): Promise<string> => {
    setIsUploading(true);
    setError(null);

    try {
      const ext = blob.type.split('/')[1]?.split(';')[0] ?? 'webm';
      const formData = new FormData();
      formData.append('audio', blob, `onboarding.${ext}`);
      formData.append('duration', durationSecs.toString());
      formData.append('language', 'en');
      formData.append('topic', ONBOARDING_TOPIC);
      formData.append('isOnboarding', 'true');

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
      const message = err instanceof Error ? err.message : 'Failed to upload recording';
      setError(message);
      throw err;
    } finally {
      setIsUploading(false);
    }
  };

  return { upload, isUploading, error };
}
