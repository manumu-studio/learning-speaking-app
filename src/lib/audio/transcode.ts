// Audio transcoding utilities for converting browser recordings to Azure-compatible PCM WAV
import { spawn } from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';

/**
 * Converts any audio format Buffer (typically WebM/Opus from browser recordings)
 * to a PCM 16kHz mono 16-bit WAV Buffer suitable for the Azure Speech SDK.
 *
 * Uses ffmpeg-static -- no system ffmpeg required.
 */
export async function toPcm16kMonoWav(input: Buffer): Promise<Buffer> {
  if (!ffmpegPath) throw new Error('ffmpeg-static binary not found');

  // Extract after null check so TypeScript narrows to string inside the Promise closure
  const resolvedPath = ffmpegPath;

  return new Promise<Buffer>((resolve, reject) => {
    const ff = spawn(
      resolvedPath,
      [
        '-hide_banner',
        '-loglevel',
        'error',
        '-i',
        'pipe:0',
        '-ac',
        '1',
        '-ar',
        '16000',
        '-c:a',
        'pcm_s16le',
        '-f',
        'wav',
        'pipe:1',
      ],
      { stdio: 'pipe' },
    );

    if (!ff.stdout || !ff.stderr || !ff.stdin) {
      reject(new Error('Failed to spawn ffmpeg: stdio streams unavailable'));
      return;
    }

    const out: Buffer[] = [];
    const err: Buffer[] = [];

    ff.stdout.on('data', (chunk: Buffer) => out.push(chunk));
    ff.stderr.on('data', (chunk: Buffer) => err.push(chunk));
    ff.on('error', reject);

    ff.on('close', (code: number | null) => {
      if (code !== 0) {
        reject(
          new Error(
            `ffmpeg exited with code ${code}: ${Buffer.concat(err).toString()}`,
          ),
        );
        return;
      }

      const result = Buffer.concat(out);

      // Validate RIFF WAV header — 4-byte magic at offset 0
      if (result.subarray(0, 4).toString('ascii') !== 'RIFF') {
        reject(new Error('ffmpeg output is not a valid WAV file (missing RIFF header)'));
        return;
      }

      resolve(result);
    });

    ff.stdin.end(input);
  });
}
