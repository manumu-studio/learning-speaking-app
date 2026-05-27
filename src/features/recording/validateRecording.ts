// Pure pre-upload validation gates — duration, size, and MIME type checks
import type {
  RecordingValidationInput,
  ValidationFailure,
  ValidationResult,
} from './validateRecording.types';

export const MIN_DURATION_SECONDS = 2;
export const MAX_DURATION_SECONDS = 300;
export const MIN_BLOB_BYTES = 500;
export const MAX_BLOB_BYTES = 25 * 1024 * 1024;

const ALLOWED_MIME_PREFIXES = ['audio/webm', 'audio/mp4', 'audio/ogg'] as const;

function failure(
  code: ValidationFailure['code'],
  message: string,
): ValidationResult {
  return { valid: false, code, message };
}

function isAllowedMimeType(mimeType: string): boolean {
  const normalized = mimeType.toLowerCase().split(';')[0]?.trim() ?? '';
  return ALLOWED_MIME_PREFIXES.some((prefix) => normalized === prefix);
}

export function validateRecording(input: RecordingValidationInput): ValidationResult {
  const { durationSeconds, blob, mimeType } = input;

  if (durationSeconds < MIN_DURATION_SECONDS) {
    return failure(
      'DURATION_TOO_SHORT',
      `Recording is too short — speak for at least ${MIN_DURATION_SECONDS} seconds.`,
    );
  }

  if (durationSeconds > MAX_DURATION_SECONDS) {
    return failure(
      'DURATION_TOO_LONG',
      `Recording is too long — keep sessions under ${MAX_DURATION_SECONDS} seconds.`,
    );
  }

  if (blob.size < MIN_BLOB_BYTES) {
    return failure(
      'BLOB_TOO_SMALL',
      'Recording file is empty or corrupted — please try again.',
    );
  }

  if (blob.size > MAX_BLOB_BYTES) {
    return failure(
      'BLOB_TOO_LARGE',
      'Recording is too large to upload — try a shorter session.',
    );
  }

  if (!isAllowedMimeType(mimeType)) {
    return failure(
      'UNSUPPORTED_FORMAT',
      'Unsupported audio format — please use a modern browser and try again.',
    );
  }

  return { valid: true };
}
