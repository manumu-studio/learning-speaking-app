// Verifies production environment variables are set correctly
// Usage: npx tsx scripts/verify-env.ts

const REQUIRED_VARS = [
  'DATABASE_URL',
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL',
  'AUTH_CLIENT_ID',
  'AUTH_CLIENT_SECRET',
  'APP_URL',
] as const;

const RECOMMENDED_VARS = [
  { name: 'OPENAI_API_KEY', reason: 'Whisper transcription won\'t work' },
  { name: 'ANTHROPIC_API_KEY', reason: 'Claude analysis won\'t work' },
  { name: 'R2_ACCOUNT_ID', reason: 'Audio upload won\'t work' },
  { name: 'R2_ACCESS_KEY_ID', reason: 'Audio upload won\'t work' },
  { name: 'R2_SECRET_ACCESS_KEY', reason: 'Audio upload won\'t work' },
  { name: 'R2_BUCKET_NAME', reason: 'Audio upload won\'t work' },
  { name: 'QSTASH_TOKEN', reason: 'Async pipeline disabled (sync fallback in dev only)' },
  { name: 'QSTASH_CURRENT_SIGNING_KEY', reason: 'QStash webhook verification won\'t work' },
  { name: 'QSTASH_NEXT_SIGNING_KEY', reason: 'QStash key rotation won\'t work' },
  { name: 'UPSTASH_REDIS_REST_URL', reason: 'Rate limiting disabled' },
  { name: 'UPSTASH_REDIS_REST_TOKEN', reason: 'Rate limiting disabled' },
] as const;

let hasErrors = false;

console.log('\n🔍 Checking required environment variables...\n');

for (const varName of REQUIRED_VARS) {
  const value = process.env[varName];
  if (!value) {
    console.log(`  ❌ ${varName} — MISSING (required)`);
    hasErrors = true;
  } else if (varName === 'APP_URL' && value.includes('localhost')) {
    console.log(`  ⚠️  ${varName} = "${value}" — looks like a dev URL`);
  } else if (varName === 'NEXTAUTH_SECRET' && value.length < 32) {
    console.log(`  ⚠️  ${varName} — too short (minimum 32 characters)`);
  } else {
    console.log(`  ✅ ${varName}`);
  }
}

console.log('\n🔍 Checking recommended environment variables...\n');

for (const { name, reason } of RECOMMENDED_VARS) {
  const value = process.env[name];
  if (!value) {
    console.log(`  ⚠️  ${name} — not set (${reason})`);
  } else {
    console.log(`  ✅ ${name}`);
  }
}

console.log('');

if (hasErrors) {
  console.log('🔴 Required environment variables are missing. Fix before deploying.\n');
  process.exit(1);
} else {
  console.log('✅ All required environment variables are set.\n');
}
