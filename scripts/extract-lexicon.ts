// Extract all words from existing transcripts and save to UserWord table with frequency
import { prisma } from '../src/lib/prisma';

const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'if', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
  'may', 'might', 'shall', 'can', 'need', 'must', 'i', 'me', 'my', 'mine', 'we',
  'us', 'our', 'you', 'your', 'he', 'him', 'his', 'she', 'her', 'it', 'its',
  'they', 'them', 'their', 'this', 'that', 'these', 'those', 'what', 'which',
  'who', 'whom', 'when', 'where', 'why', 'how', 'all', 'each', 'every', 'both',
  'few', 'more', 'most', 'some', 'any', 'no', 'not', 'only', 'own', 'same',
  'so', 'than', 'too', 'very', 'just', 'because', 'as', 'about', 'up', 'out',
  'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between',
  'under', 'again', 'then', 'once', 'here', 'there', 'also', 'well', 'back',
  'still', 'already', 'even', 'now', 'really', 'quite', 'much', 'many', 'such',
  'like', 'get', 'got', 'go', 'going', 'gone', 'went', 'come', 'came', 'make',
  'made', 'take', 'took', 'give', 'gave', 'say', 'said', 'tell', 'told', 'know',
  'knew', 'think', 'thought', 'see', 'saw', 'want', 'look', 'use', 'used',
  'find', 'found', 'put', 'run', 'set', 'try', 'tried', 'ask', 'work', 'call',
  'keep', 'let', 'begin', 'show', 'hear', 'play', 'move', 'live', 'believe',
  'happen', 'thing', 'things', 'something', 'anything', 'nothing', 'everything',
  'time', 'way', 'day', 'man', 'woman', 'people', 'good', 'bad', 'big', 'small',
  'long', 'new', 'old', 'right', 'left', 'first', 'last', 'great', 'little',
  'yes', 'no', 'ok', 'okay', 'yeah', 'um', 'uh', 'ah', 'oh', 'hmm', 'mm',
  'gonna', 'wanna', 'gotta', 'kinda', 'sorta', 'dunno', 'lot', 'bit',
  'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'don', 'doesn', 'didn', 'won', 'wouldn', 'couldn', 'shouldn', 'isn', 'aren',
  'wasn', 'weren', 'hasn', 'haven', 'hadn', 'll', 've', 're', 't', 's', 'd', 'm',
  'able', 'actually', 'always', 'away', 'another', 'around', 'down', 'else',
  'end', 'enough', 'ever', 'example', 'far', 'feel', 'kind', 'mean', 'need',
  'never', 'next', 'number', 'part', 'place', 'point', 'start', 'started',
  'sure', 'turn', 'point', 'different', 'real', 'maybe', 'probably',
  // Round 2 — common words that slipped through
  'other', 'others', 'money', 'working', 'course', 'words', 'word',
  'sometimes', 'using', 'without', 'while', 'since', 'name', 'past',
  'being', 'doing', 'having', 'getting', 'making', 'taking', 'saying',
  'looking', 'coming', 'giving', 'seeing', 'knowing', 'thinking', 'going',
  'talking', 'telling', 'trying', 'asking', 'calling', 'helping', 'learning',
  'reading', 'speaking', 'listening', 'watching', 'writing', 'building',
  'running', 'putting', 'sitting', 'standing', 'waiting', 'living',
  'second', 'third', 'hundred', 'thousand', 'million', 'billion',
  'today', 'tomorrow', 'yesterday', 'morning', 'evening', 'night', 'week',
  'month', 'year', 'years', 'months', 'weeks', 'days', 'hours', 'minutes',
  'ago', 'later', 'soon', 'early', 'late', 'often', 'usually', 'sometimes',
  'however', 'also', 'though', 'although', 'whether', 'either', 'neither',
  'yet', 'until', 'unless', 'per', 'among', 'upon', 'within', 'towards',
  'along', 'across', 'behind', 'beyond', 'against', 'among', 'beside',
  'america', 'london', 'colombia', 'english', 'spanish', 'trump', 'donald',
  'basically', 'literally', 'obviously', 'definitely', 'certainly',
  'says', 'goes', 'comes', 'makes', 'takes', 'gives', 'gets', 'puts',
  'looks', 'seems', 'means', 'becomes', 'keeps', 'helps', 'brings',
  'least', 'less', 'whole', 'half', 'important', 'possible', 'necessary',
  'better', 'best', 'worse', 'worst', 'high', 'low', 'full', 'free',
  'true', 'false', 'open', 'close', 'hard', 'easy', 'clear', 'simple',
  'case', 'fact', 'idea', 'problem', 'question', 'answer', 'reason',
  'state', 'country', 'world', 'system', 'group', 'area', 'level',
  'side', 'head', 'hand', 'home', 'house', 'family', 'life',
  'says', 'called', 'based', 'given', 'known', 'seen', 'done',
  'become', 'became', 'taken', 'left', 'held', 'brought', 'lost',
  'according', 'almost', 'together', 'everything', 'everyone', 'everyone',
  'therefore', 'instead', 'perhaps', 'rather', 'simply', 'directly',
  'overall', 'likely', 'exactly', 'especially', 'completely', 'generally',
  // Round 3 — more noise from actual data
  'needs', 'ones', 'create', 'changes', 'change', 'verbs', 'verb',
  'murillo', 'manuel', 'johan', 'japan', 'weekend', 'sentence', 'sentences',
  'clause', 'clauses', 'subject', 'object', 'noun', 'nouns', 'adjective',
  'adverb', 'pronoun', 'preposition', 'conjunction', 'article',
  'apples', 'apple', 'hello', 'sorry', 'please', 'thank', 'thanks',
  'okay', 'right', 'wrong', 'stuff', 'lots', 'things',
  'government', 'governments', 'public', 'private', 'service', 'services',
  'percent', 'market', 'stock', 'tax', 'taxes', 'cost', 'costs',
  'spend', 'spending', 'price', 'prices', 'pay', 'paid', 'paying',
  'buy', 'sell', 'bought', 'sold', 'own', 'owned',
  'person', 'child', 'children', 'son', 'daughter', 'parent', 'parents',
  'friend', 'friends', 'partner', 'brother', 'sister',
  'water', 'food', 'clothes', 'shorts', 'summer', 'winter',
  'city', 'town', 'street', 'school', 'university', 'job', 'jobs',
  'car', 'bus', 'train', 'phone', 'computer', 'video', 'app',
  'class', 'classes', 'test', 'tests', 'exam', 'degree',
  'door', 'room', 'table', 'bed', 'chair', 'book', 'books',
  'sort', 'type', 'types', 'form', 'forms', 'line', 'lines',
  'top', 'bottom', 'front', 'middle', 'inside', 'outside',
  'already', 'able', 'real', 'main', 'major', 'large',
  'common', 'single', 'similar', 'certain', 'recent', 'specific',
  'read', 'reading', 'write', 'talk', 'talking', 'spoke', 'spoken',
]);

function extractWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

async function main() {
  const targetEmail = process.argv[2] ?? 'jopulido93@hotmail.com';
  const candidates = await prisma.user.findMany({
    where: { email: targetEmail },
    select: { id: true, email: true, _count: { select: { sessions: true } } },
    orderBy: { sessions: { _count: 'desc' } },
  });
  const user = candidates[0] ?? null;

  if (!user) {
    console.error('❌ No user found');
    process.exit(1);
  }

  const sessions = await prisma.speakingSession.findMany({
    where: { userId: user.id, status: 'DONE' },
    select: {
      id: true,
      createdAt: true,
      transcript: { select: { text: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`🔍 User: ${user.email ?? user.id}`);
  console.log(`📝 Sessions with transcripts: ${sessions.filter((s) => s.transcript?.text).length}`);

  // word → { firstSeenAt, firstSeenSessionId, sessionCount, totalCount }
  const lexicon = new Map<string, {
    firstSeenAt: Date;
    firstSeenSessionId: string;
    sessionCount: number;
    totalCount: number;
  }>();

  for (const session of sessions) {
    if (!session.transcript?.text) continue;

    const words = extractWords(session.transcript.text);
    const uniqueInSession = new Set(words);

    for (const word of uniqueInSession) {
      const existing = lexicon.get(word);
      if (existing) {
        existing.sessionCount++;
        existing.totalCount += words.filter((w) => w === word).length;
      } else {
        lexicon.set(word, {
          firstSeenAt: session.createdAt,
          firstSeenSessionId: session.id,
          sessionCount: 1,
          totalCount: words.filter((w) => w === word).length,
        });
      }
    }
  }

  console.log(`🧠 Unique words found: ${lexicon.size}`);

  let inserted = 0;
  for (const [word, data] of lexicon) {
    await prisma.userWord.upsert({
      where: { userId_word: { userId: user.id, word } },
      create: {
        userId: user.id,
        word,
        cefrLevel: 'b2',
        firstSeenAt: data.firstSeenAt,
        lastSeenAt: data.firstSeenAt,
        sessionCount: data.sessionCount,
        firstSeenSessionId: data.firstSeenSessionId,
      },
      update: {
        sessionCount: data.sessionCount,
      },
    });
    inserted++;
  }

  // Print top 30 most used
  const sorted = [...lexicon.entries()].sort((a, b) => b[1].totalCount - a[1].totalCount);
  console.log(`\n✅ Saved ${inserted} words\n`);
  console.log('📊 Top 30 most used words:');
  for (const [word, data] of sorted.slice(0, 30)) {
    console.log(`   ${word.padEnd(20)} ${String(data.totalCount).padStart(3)}x across ${data.sessionCount} sessions`);
  }
}

main()
  .catch((e) => {
    console.error('Fatal error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
