// Cloudflare R2 storage client for temporary audio files
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
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
  });
  _bucketName = bucketName;

  return { client: _r2Client, bucketName: _bucketName };
}

/**
 * Upload audio file to R2 bucket
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
 * Retrieve audio file from R2 bucket
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
 * Delete audio file from R2 bucket
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
 * Generate R2 storage key for session audio
 */
export function generateAudioKey(
  userId: string,
  sessionId: string,
  extension = 'webm'
): string {
  return `sessions/${userId}/${sessionId}/audio.${extension}`;
}
