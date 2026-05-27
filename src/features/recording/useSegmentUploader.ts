// Manages background uploads of auto-segmented recording chunks
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
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

export interface SegmentUploadState {
  segmentIndex: number;
  status: 'uploading' | 'completed' | 'failed';
  sessionId?: string;
  error?: string;
}

export interface SegmentUploaderConfig {
  topic?: string | undefined;
  focus?: { focusKey: string; focusLabel: string } | null | undefined;
}

interface UseSegmentUploaderReturn {
  segments: SegmentUploadState[];
  uploadSegment: (blob: Blob, duration: number, segmentIndex: number) => void;
  totalUploaded: number;
  totalFailed: number;
  isUploading: boolean;
  latestSessionId: string | null;
}

async function uploadBlob(
  blob: Blob,
  durationSecs: number,
  config: SegmentUploaderConfig
): Promise<string> {
  const formData = new FormData();
  formData.append(
    'audio',
    blob,
    `recording.${blob.type.split('/')[1]?.split(';')[0] ?? 'webm'}`
  );
  formData.append('duration', durationSecs.toString());
  formData.append('language', 'en');

  if (config.focus) {
    formData.append('focusMetricKey', config.focus.focusKey);
    formData.append('topic', config.focus.focusLabel);
  } else if (config.topic) {
    formData.append('topic', config.topic);
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
}

export function useSegmentUploader(config: SegmentUploaderConfig = {}): UseSegmentUploaderReturn {
  const [segments, setSegments] = useState<SegmentUploadState[]>([]);
  const [latestSessionId, setLatestSessionId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const activeUploadsRef = useRef(0);
  const configRef = useRef(config);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  const uploadSegment = useCallback((blob: Blob, duration: number, segmentIndex: number) => {
    setSegments((prev) => [
      ...prev,
      { segmentIndex, status: 'uploading' },
    ]);
    activeUploadsRef.current += 1;
    setIsUploading(true);

    queueRef.current = queueRef.current
      .then(async () => {
        try {
          const sessionId = await uploadBlob(blob, duration, configRef.current);
          setLatestSessionId(sessionId);
          setSegments((prev) =>
            prev.map((seg) =>
              seg.segmentIndex === segmentIndex
                ? { ...seg, status: 'completed', sessionId }
                : seg
            )
          );
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Upload failed';
          setSegments((prev) =>
            prev.map((seg) =>
              seg.segmentIndex === segmentIndex
                ? { ...seg, status: 'failed', error: message }
                : seg
            )
          );
        } finally {
          activeUploadsRef.current -= 1;
          if (activeUploadsRef.current === 0) {
            setIsUploading(false);
          }
        }
      });
  }, []);

  const totalUploaded = segments.filter((s) => s.status === 'completed').length;
  const totalFailed = segments.filter((s) => s.status === 'failed').length;

  return {
    segments,
    uploadSegment,
    totalUploaded,
    totalFailed,
    isUploading,
    latestSessionId,
  };
}
