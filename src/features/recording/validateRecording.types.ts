// Types for pre-upload recording validation gates
export type ValidationErrorCode =
  | 'DURATION_TOO_SHORT'
  | 'DURATION_TOO_LONG'
  | 'BLOB_TOO_SMALL'
  | 'BLOB_TOO_LARGE'
  | 'UNSUPPORTED_FORMAT';

export interface ValidationSuccess {
  valid: true;
}

export interface ValidationFailure {
  valid: false;
  code: ValidationErrorCode;
  message: string;
}

export type ValidationResult = ValidationSuccess | ValidationFailure;

export interface RecordingValidationInput {
  durationSeconds: number;
  blob: Blob;
  mimeType: string;
}
