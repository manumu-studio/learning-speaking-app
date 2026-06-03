// Seed corpus reference tables (Lexeme, Collocation, MultiWordExpression) from 8 academic datasets
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { prisma } from '../src/lib/prisma';

const DATA_DIR = resolve(__dirname, '../data/corpus-sources');
const BATCH_SIZE = 500;

// ─── CSV / TSV Helpers ──────────────────────────────────────────────

function parseCsv(filePath: string, delimiter = ','): Record<string, string>[] {
  const raw = readFileSync(filePath, 'utf-8');
  const lines = raw.split('\n').filter((l) => l.trim());
  const headerLine = lines[0];
  if (!headerLine) return [];
  const headers = headerLine.replace(/^﻿/, '').split(delimiter).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(delimiter).map((v) => v.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = values[i] ?? '';
    });
    return row;
  });
}

function parseTsv(filePath: string, skipLines = 0): Record<string, string>[] {
  return parseCsv(filePath, '\t').slice(skipLines);
}

function num(val: string | undefined): number | null {
  if (!val) return null;
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

function int(val: string | undefined): number | null {
  if (!val) return null;
  const n = parseInt(val, 10);
  return isNaN(n) ? null : n;
}

// ─── Lexeme Seeders ─────────────────────────────────────────────────

async function seedNgsl(): Promise<number> {
  const rows = parseCsv(resolve(DATA_DIR, 'ngsl/NGSL_12_stats.csv'));
  const data = rows.map((r) => ({
    lemma: (r['Lemma'] ?? '').toLowerCase(),
    pos: '',
    freqPerMillion: num(r['Adjusted Frequency per Million (U)']),
    spokenFreqPerM: null,
    rank: int(r['SFI Rank']),
    zipf: null,
    cefr: null,
    sfi: num(r['SFI']),
    source: 'NGSL',
  })).filter((d) => d.lemma);

  return batchInsertLexemes(data);
}

async function seedNawl(): Promise<number> {
  const rows = parseCsv(resolve(DATA_DIR, 'nawl/NAWL_12_stats.csv'));
  const data = rows.map((r) => ({
    lemma: (r['Word'] ?? '').toLowerCase(),
    pos: '',
    freqPerMillion: num(r['U']),
    spokenFreqPerM: null,
    rank: int(r['Rank']),
    zipf: null,
    cefr: null,
    sfi: num(r['SFI']),
    source: 'NAWL',
  })).filter((d) => d.lemma);

  return batchInsertLexemes(data);
}

async function seedCefrJ(): Promise<number> {
  const rows = parseCsv(resolve(DATA_DIR, 'cefr-j/cefrj-vocabulary-profile-1.5.csv'));
  const data = rows.map((r) => ({
    lemma: (r['headword'] ?? '').toLowerCase(),
    pos: (r['pos'] ?? '').toLowerCase(),
    freqPerMillion: null,
    spokenFreqPerM: null,
    rank: null,
    zipf: null,
    cefr: r['CEFR'] ?? null,
    sfi: null,
    source: 'CEFR_J',
  })).filter((d) => d.lemma);

  return batchInsertLexemes(data);
}

async function seedOctanove(): Promise<number> {
  const rows = parseCsv(resolve(DATA_DIR, 'octanove/octanove-vocabulary-profile-c1c2-1.0.csv'));
  const data = rows.map((r) => ({
    lemma: (r['headword'] ?? '').toLowerCase(),
    pos: (r['pos'] ?? '').toLowerCase(),
    freqPerMillion: null,
    spokenFreqPerM: null,
    rank: null,
    zipf: null,
    cefr: r['CEFR'] ?? null,
    sfi: null,
    source: 'OCTANOVE',
  })).filter((d) => d.lemma);

  return batchInsertLexemes(data);
}

async function seedSubtlex(): Promise<number> {
  const rows = parseTsv(resolve(DATA_DIR, 'subtlex/SUBTLEXus74286wordstextversion.txt'));
  const data = rows.map((r) => ({
    lemma: (r['Word'] ?? '').toLowerCase(),
    pos: '',
    freqPerMillion: num(r['SUBTLWF']),
    spokenFreqPerM: null,
    rank: null,
    zipf: num(r['Lg10WF']),
    cefr: null,
    sfi: null,
    source: 'SUBTLEX',
  })).filter((d) => d.lemma);

  return batchInsertLexemes(data);
}

// ─── Collocation Seeders ────────────────────────────────────────────

function parseAclWord(raw: string): { lemma: string; pos: string | null } {
  const match = raw.match(/^(.+?)\s*\((\w+)\)$/);
  if (match) return { lemma: (match[1] ?? '').trim().toLowerCase(), pos: (match[2] ?? '').toLowerCase() };
  return { lemma: raw.trim().toLowerCase(), pos: null };
}

async function seedAcl(): Promise<number> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const XLSX = require('xlsx');
  const wb = XLSX.readFile(resolve(DATA_DIR, 'acl/Academic_Collocation_List.xlsx'));
  const sheet = wb.Sheets['Academic Collocation List'];
  if (!sheet) return 0;
  const rows: (string | number | null)[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  type AclEntry = { headLemma: string; headPos: string | null; collocate: string; collocatePos: string | null };
  const entries: AclEntry[] = [];
  let currentHead = '';
  let currentHeadPos: string | null = null;

  // Skip header row (index 1), start from index 2
  for (let i = 2; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;

    const comp1 = row[1] != null ? String(row[1]) : null;
    const comp2 = row[2] != null ? String(row[2]) : null;

    if (comp1) {
      const parsed = parseAclWord(comp1);
      currentHead = parsed.lemma;
      currentHeadPos = parsed.pos;
    }

    if (comp2 && currentHead) {
      const parsed = parseAclWord(comp2);
      entries.push({
        headLemma: currentHead,
        headPos: currentHeadPos,
        collocate: parsed.lemma,
        collocatePos: parsed.pos,
      });
    }
  }

  const data = entries.map((e) => ({
    headLemma: e.headLemma,
    headPos: e.headPos,
    collocate: e.collocate,
    collocatePos: e.collocatePos,
    relation: null,
    freq: null,
    mi: null,
    logDice: null,
    tScore: null,
    source: 'ACL',
  }));

  return batchInsertCollocations(data);
}

async function seedCoca(): Promise<number> {
  const raw = readFileSync(resolve(DATA_DIR, 'acl/collocates-info-samples.txt'), 'utf-8');
  const lines = raw.split('\n');

  // Find header line and data start
  const headerIdx = lines.findIndex((l) => l.startsWith('ID\t'));
  if (headerIdx === -1) {
    console.warn('  ⚠️ COCA: no header found');
    return 0;
  }

  // Parse data rows (skip separator line after header)
  type CocaRow = { headLemma: string; headPos: string; collocate: string; collocatePos: string; freq: number; mi: number };
  const parsed: CocaRow[] = [];

  for (let i = headerIdx + 2; i < lines.length; i++) {
    const line = lines[i];
    if (!line?.trim()) continue;
    const parts = line.split('\t');
    if (parts.length < 7) continue;

    const headLemma = (parts[1] ?? '').toLowerCase();
    const headPos = (parts[2] ?? '').toLowerCase();
    const collocate = (parts[3] ?? '').toLowerCase();
    const collocatePos = (parts[4] ?? '').toLowerCase();
    // Column 5 = freq (large integer), Column 6 = MI (small float)
    const freq = parseInt(parts[5] ?? '', 10);
    const mi = parseFloat(parts[6] ?? '');

    if (!headLemma || !collocate || isNaN(mi)) continue;
    parsed.push({ headLemma, headPos, collocate, collocatePos, freq, mi });
  }

  // Sort by MI descending, keep top 50k
  parsed.sort((a, b) => b.mi - a.mi);
  const top = parsed.slice(0, 50_000);

  const data = top.map((r) => ({
    headLemma: r.headLemma,
    headPos: r.headPos || null,
    collocate: r.collocate,
    collocatePos: r.collocatePos || null,
    relation: null,
    freq: isNaN(r.freq) ? null : r.freq,
    mi: r.mi,
    logDice: null,
    tScore: null,
    source: 'COCA',
  }));

  return batchInsertCollocations(data);
}

// ─── MWE Seeders ────────────────────────────────────────────────────

function sortedLemmaKey(phrase: string): string {
  return phrase.toLowerCase().split(/\s+/).sort().join(',');
}

async function seedPhave(): Promise<number> {
  const raw = readFileSync(resolve(DATA_DIR, 'phave/phave-list.json'), 'utf-8');
  const entries: Array<{
    rank: number;
    phrasalVerb: string;
    senses: Array<{
      senseNumber: number;
      definition: string;
      frequencyPct: number;
      exampleForm: string;
      example: string;
    }>;
  }> = JSON.parse(raw);

  const data = entries.map((e) => ({
    canonical: e.phrasalVerb.toLowerCase(),
    lemmaKey: sortedLemmaKey(e.phrasalVerb),
    type: 'phrasal_verb',
    freq: null,
    spokenFreq: null,
    writtenFreq: null,
    ftw: null,
    cefr: null,
    senseNote: JSON.stringify(e.senses),
    source: 'PHAVE',
  }));

  return batchInsertMwes(data);
}

async function seedAfl(): Promise<number> {
  const raw = readFileSync(resolve(DATA_DIR, 'afl/afl-list.json'), 'utf-8');
  const entries: Array<{
    list: string;
    number: number;
    formula: string;
    freqSpeechPerMillion: number;
    freqWritingPerMillion: number;
    ftw: number;
  }> = JSON.parse(raw);

  const data = entries.map((e) => ({
    canonical: e.formula.toLowerCase(),
    lemmaKey: sortedLemmaKey(e.formula),
    type: 'formula',
    freq: (e.freqSpeechPerMillion + e.freqWritingPerMillion) / 2,
    spokenFreq: e.freqSpeechPerMillion,
    writtenFreq: e.freqWritingPerMillion,
    ftw: e.ftw,
    cefr: null,
    senseNote: e.list,
    source: 'AFL',
  }));

  return batchInsertMwes(data);
}

// ─── Batch Insert Helpers ───────────────────────────────────────────

type LexemeRow = {
  lemma: string;
  pos: string;
  freqPerMillion: number | null;
  spokenFreqPerM: number | null;
  rank: number | null;
  zipf: number | null;
  cefr: string | null;
  sfi: number | null;
  source: string;
};

async function batchInsertLexemes(rows: LexemeRow[]): Promise<number> {
  let total = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const result = await prisma.lexeme.createMany({
      data: batch,
      skipDuplicates: true,
    });
    total += result.count;
  }
  return total;
}

type CollocationRow = {
  headLemma: string;
  headPos: string | null;
  collocate: string;
  collocatePos: string | null;
  relation: string | null;
  freq: number | null;
  mi: number | null;
  logDice: number | null;
  tScore: number | null;
  source: string;
};

async function batchInsertCollocations(rows: CollocationRow[]): Promise<number> {
  let total = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const result = await prisma.collocation.createMany({
      data: batch,
      skipDuplicates: true,
    });
    total += result.count;
  }
  return total;
}

type MweRow = {
  canonical: string;
  lemmaKey: string;
  type: string;
  freq: number | null;
  spokenFreq: number | null;
  writtenFreq: number | null;
  ftw: number | null;
  cefr: string | null;
  senseNote: string | null;
  source: string;
};

async function batchInsertMwes(rows: MweRow[]): Promise<number> {
  let total = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const result = await prisma.multiWordExpression.createMany({
      data: batch,
      skipDuplicates: true,
    });
    total += result.count;
  }
  return total;
}

// ─── Main ───────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Corpus seed — ingesting 8 datasets\n');

  const results: Array<{ name: string; count: number; ms: number }> = [];

  async function run(name: string, fn: () => Promise<number>) {
    const start = performance.now();
    const count = await fn();
    const ms = Math.round(performance.now() - start);
    results.push({ name, count, ms });
    console.log(`  ✅ ${name}: ${count.toLocaleString()} rows (${ms}ms)`);
  }

  console.log('📚 Lexeme sources:');
  await run('NGSL', seedNgsl);
  await run('NAWL', seedNawl);
  await run('CEFR-J', seedCefrJ);
  await run('Octanove', seedOctanove);
  await run('SUBTLEX-US', seedSubtlex);

  console.log('\n🔗 Collocation sources:');
  await run('ACL', seedAcl);
  await run('COCA (top 50k)', seedCoca);

  console.log('\n📝 Multi-word expressions:');
  await run('PHaVE', seedPhave);
  await run('AFL', seedAfl);

  // Summary
  const totalRows = results.reduce((sum, r) => sum + r.count, 0);
  const totalMs = results.reduce((sum, r) => sum + r.ms, 0);
  console.log(`\n🎯 Total: ${totalRows.toLocaleString()} rows in ${(totalMs / 1000).toFixed(1)}s`);

  // Verify counts per table
  const [lexemes, collocations, mwes] = await Promise.all([
    prisma.lexeme.count(),
    prisma.collocation.count(),
    prisma.multiWordExpression.count(),
  ]);
  console.log(`\n📊 Table totals:`);
  console.log(`   lexemes:          ${lexemes.toLocaleString()}`);
  console.log(`   collocations:     ${collocations.toLocaleString()}`);
  console.log(`   mwe:              ${mwes.toLocaleString()}`);
}

main()
  .catch((e) => {
    console.error('❌ Fatal error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
