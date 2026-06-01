// Cloudflare R2 storage client for temporary audio files
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '@/lib/env';

// Runtime validation — R2 vars are optional in env.ts but required here
function requireEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}. Configure R2 credentials to enable audio storage.`);
  }
  return value;
}

// Lazy singleton — initialized on first use to avoid build-time crashes
let _r2Client: S3Client | null = null;
let _bucketName: string | null = null;

function getR2Client(): { client: S3Client; bucketName: string } {
  if (_r2Client && _bucketName) {
    return { client: _r2Client, bucketName: _bucketName };
  }

  const accountId = requireEnv(env.R2_ACCOUNT_ID, 'R2_ACCOUNT_ID');
  const accessKeyId = requireEnv(env.R2_ACCESS_KEY_ID, 'R2_ACCESS_KEY_ID');
  const secretAccessKey = requireEnv(env.R2_SECRET_ACCESS_KEY, 'R2_SECRET_ACCESS_KEY');
  const bucketName = requireEnv(env.R2_BUCKET_NAME, 'R2_BUCKET_NAME');

  _r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  });
  _bucketName = bucketName;

  return { client: _r2Client, bucketName: _bucketName };
}

/**
 * Uploads an audio buffer to the R2 bucket under the given key.
 *
 * @param key - Storage key (path) within the bucket.
 * @param body - Raw audio data to upload.
 * @param contentType - MIME type, e.g. `'audio/webm'` or `'audio/wav'`.
 * @returns The storage `key` on success (unchanged).
 */
export async function uploadAudio(
  key: string,
  body: Buffer,
  contentType: string
): Promise<string> {
  const { client, bucketName } = getR2Client();
  await client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
  return key;
}

/**
 * Retrieves an audio file from the R2 bucket as a `Buffer`.
 *
 * @param key - Storage key of the object to fetch.
 * @returns The audio data as a `Buffer`.
 * @throws If R2 returns no body for the given key.
 */
export async function getAudio(key: string): Promise<Buffer> {
  const { client, bucketName } = getR2Client();
  const response = await client.send(
    new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    })
  );

  const body = response.Body;
  if (!body) {
    throw new Error(`No data returned for key: ${key}`);
  }

  return Buffer.from(await body.transformToByteArray());
}

/**
 * Deletes an audio file from the R2 bucket.
 *
 * @param key - Storage key of the object to delete.
 */
export async function deleteAudio(key: string): Promise<void> {
  const { client, bucketName } = getR2Client();
  await client.send(
    new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    })
  );
}

/**
 * Generates the R2 storage key for a session's full audio file.
 *
 * @param userId - The user's internal ID.
 * @param sessionId - The speaking session ID.
 * @param extension - Audio file extension (defaults to `'webm'`).
 * @returns A key in the form `sessions/<userId>/<sessionId>/audio.<extension>`.
 * @example
 * generateAudioKey('u1', 's1') // => 'sessions/u1/s1/audio.webm'
 */
export function generateAudioKey(
  userId: string,
  sessionId: string,
  extension = 'webm'
): string {
  return `sessions/${userId}/${sessionId}/audio.${extension}`;
}

/**
 * Generates the R2 storage key for a single WAV chunk within a chunked recording session.
 *
 * @param userId - The user's internal ID.
 * @param sessionId - The speaking session ID.
 * @param chunkIndex - Zero-based chunk index.
 * @returns A key in the form `sessions/<userId>/<sessionId>/chunks/<chunkIndex>.wav`.
 */
export function generateChunkAudioKey(
  userId: string,
  sessionId: string,
  chunkIndex: number,
): string {
  return `sessions/${userId}/${sessionId}/chunks/${chunkIndex}.wav`;
}

/**
 * Generates a time-limited pre-signed PUT URL for direct browser-to-R2 upload.
 *
 * @param key - Destination storage key.
 * @param contentType - MIME type to enforce on the upload.
 * @param expiresInSecs - URL validity in seconds (defaults to 300 / 5 minutes).
 * @returns A signed HTTPS URL the browser can PUT directly.
 */
export async function generatePresignedPutUrl(
  key: string,
  contentType: string,
  expiresInSecs = 300,
): Promise<string> {
  const { client, bucketName } = getR2Client();
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(client, command, { expiresIn: expiresInSecs });
}

/**
 * Generates a time-limited pre-signed GET URL for server-side audio download (e.g. Praat service).
 *
 * @param key - Storage key of the object to expose.
 * @param expiresInSecs - URL validity in seconds (defaults to 300 / 5 minutes).
 * @returns A signed HTTPS URL that allows a single GET within the expiry window.
 */
export async function generatePresignedGetUrl(
  key: string,
  expiresInSecs = 300,
): Promise<string> {
  const { client, bucketName } = getR2Client();
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  return getSignedUrl(client, command, { expiresIn: expiresInSecs });
}
