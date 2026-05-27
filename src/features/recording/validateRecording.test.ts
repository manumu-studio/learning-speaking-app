// Unit tests for pre-upload recording validation gates
import { describe, expect, it } from 'vitest';
import {
  MAX_BLOB_BYTES,
  MAX_DURATION_SECONDS,
  MIN_BLOB_BYTES,
  MIN_DURATION_SECONDS,
  validateRecording,
} from './validateRecording';

describe('validateRecording', () => {
  const validBlob = new Blob(['x'.repeat(MIN_BLOB_BYTES + 1)], { type: 'audio/webm' });

  it('accepts a valid recording', () => {
    const result = validateRecording({
      durationSeconds: MIN_DURATION_SECONDS,
      blob: validBlob,
      mimeType: 'audio/webm;codecs=opus',
    });
    expect(result.valid).toBe(true);
  });

  it('rejects recordings shorter than minimum duration', () => {
    const result = validateRecording({
      durationSeconds: MIN_DURATION_SECONDS - 1,
      blob: validBlob,
      mimeType: 'audio/webm',
    });
    expect(result).toMatchObject({
      valid: false,
      code: 'DURATION_TOO_SHORT',
    });
  });

  it('rejects recordings longer than maximum duration', () => {
    const result = validateRecording({
      durationSeconds: MAX_DURATION_SECONDS + 1,
      blob: validBlob,
      mimeType: 'audio/webm',
    });
    expect(result).toMatchObject({
      valid: false,
      code: 'DURATION_TOO_LONG',
    });
  });

  it('rejects blobs smaller than minimum size', () => {
    const result = validateRecording({
      durationSeconds: 5,
      blob: new Blob(['a'], { type: 'audio/webm' }),
      mimeType: 'audio/webm',
    });
    expect(result).toMatchObject({
      valid: false,
      code: 'BLOB_TOO_SMALL',
    });
  });

  it('rejects blobs larger than maximum size', () => {
    const result = validateRecording({
      durationSeconds: 5,
      blob: new Blob([new Uint8Array(MAX_BLOB_BYTES + 1)]),
      mimeType: 'audio/webm',
    });
    expect(result).toMatchObject({
      valid: false,
      code: 'BLOB_TOO_LARGE',
    });
  });

  it('rejects unsupported MIME types', () => {
    const result = validateRecording({
      durationSeconds: 5,
      blob: validBlob,
      mimeType: 'audio/wav',
    });
    expect(result).toMatchObject({
      valid: false,
      code: 'UNSUPPORTED_FORMAT',
    });
  });
});
