// Unit tests for R2 storage functions
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSend = vi.fn();

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => ({ send: mockSend })),
  PutObjectCommand: vi.fn(),
  GetObjectCommand: vi.fn(),
  DeleteObjectCommand: vi.fn(),
}));

vi.mock('@/lib/env', () => ({
  env: {
    R2_ACCOUNT_ID: 'test-account',
    R2_ACCESS_KEY_ID: 'test-key',
    R2_SECRET_ACCESS_KEY: 'test-secret',
    R2_BUCKET_NAME: 'test-bucket',
  },
}));

// Import after mocks are set up
import {
  uploadAudio,
  getAudio,
  deleteAudio,
  generateAudioKey,
} from '@/lib/storage/r2';
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

describe('r2 storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSend.mockResolvedValue({});
  });

  describe('uploadAudio', () => {
    it('calls PutObjectCommand with correct bucket and key', async () => {
      const key = 'sessions/user-1/session-1/audio.webm';
      const body = Buffer.from('audio-data');
      const contentType = 'audio/webm';

      const result = await uploadAudio(key, body, contentType);

      expect(PutObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: key,
        Body: body,
        ContentType: contentType,
      });
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(result).toBe(key);
    });

    it('returns the storage key on success', async () => {
      const key = 'sessions/user-2/session-2/audio.mp3';

      const result = await uploadAudio(key, Buffer.from(''), 'audio/mp3');

      expect(result).toBe(key);
    });
  });

  describe('getAudio', () => {
    it('calls GetObjectCommand and returns a buffer', async () => {
      const key = 'sessions/user-1/session-1/audio.webm';
      const fakeBytes = new Uint8Array([1, 2, 3]);

      mockSend.mockResolvedValueOnce({
        Body: { transformToByteArray: () => Promise.resolve(fakeBytes) },
      });

      const result = await getAudio(key);

      expect(GetObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: key,
      });
      expect(result).toBeInstanceOf(Buffer);
      expect(result).toEqual(Buffer.from(fakeBytes));
    });

    it('throws when Body is missing from response', async () => {
      const key = 'sessions/user-1/session-1/audio.webm';
      mockSend.mockResolvedValueOnce({ Body: undefined });

      await expect(getAudio(key)).rejects.toThrow(`No data returned for key: ${key}`);
    });
  });

  describe('deleteAudio', () => {
    it('calls DeleteObjectCommand with correct bucket and key', async () => {
      const key = 'sessions/user-1/session-1/audio.webm';

      await deleteAudio(key);

      expect(DeleteObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: key,
      });
      expect(mockSend).toHaveBeenCalledTimes(1);
    });
  });

  describe('generateAudioKey', () => {
    it('returns correct path format with default extension', () => {
      const key = generateAudioKey('user-123', 'session-456');

      expect(key).toBe('sessions/user-123/session-456/audio.webm');
    });

    it('uses provided extension when specified', () => {
      const key = generateAudioKey('user-123', 'session-456', 'mp4');

      expect(key).toBe('sessions/user-123/session-456/audio.mp4');
    });
  });
});
