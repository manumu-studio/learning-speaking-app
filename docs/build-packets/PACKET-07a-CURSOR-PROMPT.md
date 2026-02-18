# PACKET-07a: QStash Client + Whisper STT Client

**Recommended model**: Sonnet 4.6 Thinking

---

You are building PACKET-07a for the Learning Speaking App. Follow all rules in `.cursorrules`.

## Scope

**Files to CREATE:**
- `src/lib/queue/qstash.ts` — QStash client + enqueue function
- `src/lib/ai/whisper.ts` — Whisper STT client

**Files to MODIFY:** NONE (env.ts already has all required vars, r2.ts already has download/delete functions)

**Dependencies to install:**
```bash
npm install @upstash/qstash openai
```

---

## File 1: `src/lib/queue/qstash.ts`

```typescript
// QStash client for enqueuing async processing jobs
import { Client } from '@upstash/qstash';
import { env } from '@/lib/env';

// Runtime validation — QStash vars are optional in env.ts but required here
function requireEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. Configure QStash credentials to enable async processing.`
    );
  }
  return value;
}

// Lazy singleton — initialized on first use to avoid build-time crashes
let _qstashClient: Client | null = null;

function getQStashClient(): Client {
  if (_qstashClient) {
    return _qstashClient;
  }

  const token = requireEnv(env.QSTASH_TOKEN, 'QSTASH_TOKEN');
  _qstashClient = new Client({ token });
  return _qstashClient;
}

/**
 * Enqueue session processing job via QStash
 */
export async function enqueueProcessing(sessionId: string): Promise<void> {
  const client = getQStashClient();
  await client.publishJSON({
    url: `${env.APP_URL}/api/internal/process`,
    body: { sessionId },
    retries: 3,
  });
}
```

---

## File 2: `src/lib/ai/whisper.ts`

```typescript
// OpenAI Whisper client for speech-to-text transcription
import OpenAI from 'openai';
import { env } from '@/lib/env';

// Runtime validation — OPENAI_API_KEY is optional in env.ts but required here
function requireEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. Configure OpenAI credentials to enable transcription.`
    );
  }
  return value;
}

// Lazy singleton — initialized on first use to avoid build-time crashes
let _openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (_openaiClient) {
    return _openaiClient;
  }

  const apiKey = requireEnv(env.OPENAI_API_KEY, 'OPENAI_API_KEY');
  _openaiClient = new OpenAI({ apiKey });
  return _openaiClient;
}

/**
 * Transcribe audio using Whisper API
 * @param audioBuffer - Audio file as Buffer
 * @param filename - Original filename (used for MIME type inference)
 * @returns Transcript text
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  filename: string
): Promise<string> {
  const client = getOpenAIClient();

  // Convert Buffer to File object for Whisper API
  const file = new File([audioBuffer], filename, { type: 'audio/webm' });

  const response = await client.audio.transcriptions.create({
    model: 'whisper-1',
    file,
    language: 'en',
  });

  return response.text;
}
```

---

## Validation

After creating these files, run:

```bash
npx tsc --noEmit
npm run build
```

Both commands must succeed with zero errors.

---

## Key Implementation Notes

1. **Runtime validation pattern**: Both files follow the same lazy singleton pattern used in `r2.ts` (already exists in codebase). This prevents build-time crashes when env vars are missing.

2. **env.ts is NOT modified**: All required vars are already present:
   - `QSTASH_TOKEN` (optional)
   - `OPENAI_API_KEY` (optional)
   - `APP_URL` (has default: 'http://localhost:3000')

3. **r2.ts is NOT modified**: `getAudio()` and `deleteAudio()` already exist.

4. **File object creation**: Whisper API requires a `File` object. We create it from the Buffer using `new File([audioBuffer], filename, { type: 'audio/webm' })`.

5. **QStash endpoint**: Points to `/api/internal/process` (webhook handler will be created in PACKET-07c).

---

## Documentation

Create journal entry at `docs/journal/ENTRY-07a.md`:

```markdown
# ENTRY-07a — QStash + Whisper Integration

**Date**: 2026-02-18
**Type**: Feature
**Branch**: feature/processing-pipeline
**Version**: 0.7.0

## Summary

Integrated QStash for async job queuing and OpenAI Whisper for audio transcription.

## Files Created

- `src/lib/queue/qstash.ts` — QStash client with `enqueueProcessing()` function
- `src/lib/ai/whisper.ts` — Whisper STT client with `transcribeAudio()` function

## Key Decisions

1. **Lazy singleton pattern**: Both clients use runtime validation + lazy initialization to avoid build-time crashes when env vars are missing (consistent with existing `r2.ts` pattern).

2. **QStash endpoint**: Publishes to `${APP_URL}/api/internal/process` with 3 retries.

3. **Whisper model**: Using `whisper-1` (latest stable) with English language hint for better accuracy.

4. **File type**: Audio files are expected as `audio/webm` (matches frontend recording format).

## Dependencies Added

- `@upstash/qstash` — QStash client for async job queuing
- `openai` — Official OpenAI SDK (includes Whisper API)

## Next Steps

- PACKET-07b: Create Claude analysis client with Zod schema
- PACKET-07c: Create webhook handler + wire QStash trigger in sessions API
```

---

**DO NOT**:
- Modify `env.ts` (vars already present)
- Modify `r2.ts` (functions already exist)
- Add any other files beyond the two specified
- Install `@anthropic-ai/sdk` (that's in PACKET-07b)

**References**: See `.cursorrules` for TypeScript standards, file header requirements, and project structure.
