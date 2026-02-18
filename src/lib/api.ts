// Shared API response helpers and validation utilities
export function errorResponse(
  message: string,
  code: string,
  status: number
): Response {
  return Response.json({ error: message, code }, { status });
}

export function successResponse<T>(data: T, status = 200): Response {
  return Response.json(data, { status });
}

/**
 * Validate file size and MIME type for audio uploads
 */
export function validateAudioFile(
  file: File,
  maxSizeMB = 50
): { valid: boolean; error?: string } {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `File size exceeds ${maxSizeMB}MB limit`,
    };
  }

  if (!file.type.startsWith('audio/')) {
    return {
      valid: false,
      error: 'File must be an audio file',
    };
  }

  return { valid: true };
}
