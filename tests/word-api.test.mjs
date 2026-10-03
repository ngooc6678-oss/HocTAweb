import test from 'node:test';
import assert from 'node:assert/strict';
import { createWordHandlers, wordKey, MAX_REQUEST_BYTES } from '../lib/word-api.ts';

const base = 'https://wordnest.example/api/words';
const now = Date.UTC(2026, 9, 3);
const draft = { term: 'patrons (n.)', meaning: 'khách hàng', synonyms: 'customers', example: 'Regular patrons.' };
const backup = (words) => ({ format: 'wordnest-backup', version: 1, words });
const post = (data, headers = {}) => new Request(base, {
  method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://wordnest.example', ...headers }, body: JSON.stringify(data),
});

// Deliberately does not emulate RLS: these tests check the API's additional ownership
// filters independently. The actual database policies are tested in supabase/tests/.
function fixture({ userId = 'user-a', rows = [], authError = null } = {}) {
  const state = { rows: structuredClone(rows), queries: [], error: null, userId, authError };
  let sequence = 0;
  const client = {
    auth: { getUser: async () => ({ data: { user: state.userId ? { id: state.userId } : null }, error: state.authError }) },
    from(table) {
      assert.equal(table, 'words');
      const q = { mode: 'select', filters: [], ordering: [], limit: 1000, columns: '*' };
      state.queries.push(q);
      const builder = {
        select(columns) { q.columns = columns; return this; },
        eq(key, value) { q.filters.push([key, value]); return this; },
        order(key) { q.ordering.push(key); return this; },
        limit(value) { q.limit = value; return this; },
        or(filter) { q.cursor = filter; return this; },
        upsert(values, options) { q.mode = 'upsert'; q.values = values; q.options = options; return this; },
        update(values) { q.mode = 'update'; q.values = values; return this; },
        delete() { q.mode = 'delete'; return this; },
        then(resolve, reject) {
          return Promise.resolve().then(() => {
            if (state.error) return { data: null, error: state.error };
            if (q.mode === 'upsert') {
              assert.deepEqual(q.options, { onConflict: 'user_id,word_key', ignoreDuplicates: true });
              const added = [];
              for (const row of q.values) {
                if (!state.rows.some(existing => existing.user_id === row.user_id && existing.word_key === row.word_key)) {
                  state.rows.push(row); added.push({ id: row.id });
                }
              }
              return { data: added, error: null };
            }
            let selected = state.rows.filter(row => q.filters.every(([key, value]) => row[key] === value));
            if (q.mode === 'update') {
              for (const row of selected) Object.assign(row, q.values);
            } else if (q.mode === 'delete') {
              state.rows = state.rows.filter(row => !selected.includes(row));
            } else {
              selected.sort((a, b) => a.created_at - b.created_at || a.id.localeCompare(b.id));
              if (q.cursor) {
                const match = q.cursor.match(/^created_at\.gt\.(\d+),and\(created_at\.eq\.\1,id\.gt\.([A-Za-z0-9_-]+)\)$/);
                assert.ok(match, 'cursor must be a bounded numeric timestamp and ASCII identifier');
                const time = Number(match[1]), id = match[2];
                selected = selected.filter(row => row.created_at > time || (row.created_at === time && row.id > id));
              }
              selected = selected.slice(0, q.limit);
            }
            const data = selected.map(row => Object.fromEntries(q.columns.split(',').map(key => [key, row[key]])));
            return { data, error: null };
          }).then(resolve, reject);
        },
      };
      return builder;
    },
  };
  const handlers = createWordHandlers(async () => client, {
    now: () => now,
    uuid: () => `00000000-0000-4000-8000-${String(++sequence).padStart(12, '0')}`,
  });
  return { state, ...handlers };
}

test('anonymous or unverified sessions cannot read or mutate vocabulary', async () => {
  for (const options of [{ userId: null }, { authError: { message: 'invalid token' } }]) {
    const api = fixture(options);
    assert.equal((await api.GET(new Request(base))).status, 401);
    assert.equal((await api.POST(post({ action: 'import', words: [draft] }))).status, 401);
    assert.equal(api.state.queries.length, 0);
  }
});

test('foreign origins and non-JSON requests are rejected before mutations', async () => {
  const api = fixture();
  assert.equal((await api.POST(post({ action: 'import', words: [draft] }, { origin: 'https://evil.example' }))).status, 403);
  assert.equal((await api.POST(post({ action: 'import', words: [draft] }, { 'sec-fetch-site': 'cross-site' }))).status, 403);
  assert.equal((await api.POST(post({ action: 'import', words: [draft] }, { 'content-type': 'text/plain' }))).status, 415);
  assert.equal(api.state.queries.length, 0);
});

test('request limit measures streamed UTF-8 bytes, including when Content-Length is absent', async () => {
  const api = fixture();
  const raw = JSON.stringify({ value: 'ế'.repeat(Math.ceil(MAX_REQUEST_BYTES / 3)) });
  assert.ok(raw.length < MAX_REQUEST_BYTES);
  assert.ok(Buffer.byteLength(raw) > MAX_REQUEST_BYTES);
  const response = await api.POST(new Request(base, { method: 'POST', headers: { 'content-type': 'application/json' }, body: raw }));
  assert.equal(response.status, 413);
  assert.equal(api.state.queries.length, 0);
});

test('imports reject malformed structures, PostgreSQL NUL bytes and oversized batches', async () => {
  const api = fixture();
  for (const data of [null, [], { action: 'import', words: [] }, { action: 'import', words: Array(501).fill(draft) },
    { action: 'import', words: [{ ...draft, meaning: '' }] }, { action: 'import', words: [{ ...draft, term: 'bad\u0000word' }] }]) {
    assert.equal((await api.POST(post(data))).status, 400);
  }
  assert.equal(api.state.queries.length, 0);
});

test('duplicate imports preserve original learned status/date and ignore forged ownership', async () => {
  const original = { ...draft, id: 'existing', user_id: 'user-a', known: 1, created_at: now - 7 * 86400000, word_key: wordKey(draft) };
  const api = fixture({ rows: [original] });
  const response = await api.POST(post({ action: 'import', words: [{ ...draft, user_id: 'user-b', known: 0, created_at: now }] }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { added: 0, skipped: 1 });
  assert.deepEqual(api.state.rows, [original]);
  assert.equal(api.state.queries[0].values[0].user_id, 'user-a');
});

test('restoration preserves original week/status and is idempotent after retry', async () => {
  const api = fixture();
  const words = [{ ...draft, known: 1, createdAt: Date.UTC(2026, 8, 27, 16, 59) }];
  const payload = { action: 'restore', backup: backup(words) };
  assert.deepEqual(await (await api.POST(post(payload))).json(), { added: 1, skipped: 0 });
  assert.deepEqual(await (await api.POST(post(payload))).json(), { added: 0, skipped: 1 });
  assert.equal(api.state.rows[0].created_at, words[0].createdAt);
  assert.equal(api.state.rows[0].known, 1);
  assert.equal(api.state.rows.length, 1);
});

test('restore rejects chunks above100 and invalid historical data before writing', async () => {
  const api = fixture();
  const valid = { ...draft, known: 0, createdAt: now };
  for (const words of [Array(101).fill(valid), [{ ...valid, createdAt: now + 2 * 86400000 }], [{ ...valid, known: 2 }], [{ ...valid, example: '\u0000' }]]) {
    assert.equal((await api.POST(post({ action: 'restore', backup: backup(words) }))).status, 400);
  }
  assert.equal(api.state.queries.length, 0);
});

test('hash dedupe handles long Vietnamese meanings without a long indexed key', () => {
  const word = { ...draft, meaning: 'ế'.repeat(2000) };
  assert.match(wordKey(word), /^[a-f0-9]{64}$/);
  assert.equal(wordKey(draft), wordKey({ ...draft, term: '  PATRONS   (n.) ', meaning: '  KHÁCH   HÀNG  ' }));
  assert.notEqual(wordKey(draft), wordKey({ ...draft, meaning: 'người bảo trợ' }));
});

test('mutations filter both ID and owner; another user cannot be changed or deleted', async () => {
  const foreign = { ...draft, id: 'private-id', user_id: 'user-b', known: 0, created_at: now, word_key: wordKey(draft) };
  const own = { ...draft, id: 'own-id', user_id: 'user-a', known: 0, created_at: now, word_key: wordKey(draft) };
  const api = fixture({ rows: [foreign, own] });
  assert.equal((await api.POST(post({ action: 'known', id: foreign.id, known: true, user_id: 'user-b' }))).status, 404);
  assert.equal((await api.POST(post({ action: 'delete', id: foreign.id }))).status, 404);
  assert.deepEqual(api.state.rows[0], foreign);
  assert.equal((await api.POST(post({ action: 'known', id: own.id, known: true }))).status, 200);
  assert.equal(api.state.rows[1].known, 1);
  assert.equal((await api.POST(post({ action: 'delete', id: own.id }))).status, 200);
  assert.deepEqual(api.state.rows, [foreign]);
});

test('paginated reads return >1000 words once each without exposing another user', async () => {
  const rows = Array.from({ length: 1205 }, (_, i) => ({ ...draft, id: `word-${String(i).padStart(4, '0')}`, user_id: 'user-a', known: i % 2, created_at: now + Math.floor(i / 101) }));
  rows.push({ ...draft, id: 'foreign', user_id: 'user-b', known: 0, created_at: now });
  const api = fixture({ rows });
  const result = [];
  let cursor = null, pages = 0;
  do {
    const response = await api.GET(new Request(base + (cursor ? `?cursor=${encodeURIComponent(cursor)}` : '')));
    assert.equal(response.status, 200);
    assert.match(response.headers.get('cache-control'), /no-store/);
    const page = await response.json();
    assert.ok(page.words.length <= 50);
    assert.ok(page.words.every(word => Number.isSafeInteger(word.createdAt) && !('created_at' in word) && !('user_id' in word)));
    result.push(...page.words);
    cursor = page.nextCursor;
    assert.ok(++pages <= 25);
  } while (cursor);
  assert.equal(result.length, 1205);
  assert.equal(new Set(result.map(word => word.id)).size, 1205);
  assert.ok(!result.some(word => word.id === 'foreign'));
});

test('deleting a previously read row does not shift later pages', async () => {
  const rows = Array.from({ length: 52 }, (_, i) => ({ ...draft, id: `word-${String(i).padStart(3, '0')}`, user_id: 'user-a', known: 0, created_at: now }));
  const api = fixture({ rows });
  const first = await (await api.GET(new Request(base))).json();
  api.state.rows.shift();
  const next = await (await api.GET(new Request(`${base}?cursor=${first.nextCursor}`))).json();
  assert.deepEqual(next.words.map(word => word.id), ['word-050', 'word-051']);
  assert.equal(next.nextCursor, null);
});

test('malicious and malformed cursors never reach a database filter', async () => {
  const api = fixture();
  for (const cursor of ['', '???', 'a'.repeat(257), Buffer.from(JSON.stringify({ createdAt: now, id: 'x),user_id.neq.x' })).toString('base64url')]) {
    assert.equal((await api.GET(new Request(`${base}?cursor=${encodeURIComponent(cursor)}`))).status, 400);
  }
  assert.equal(api.state.queries.length, 0);
});

test('database failure returns a retryable error without leaking database details', async () => {
  const api = fixture();
  api.state.error = { code: 'failed', details: 'private vocabulary', message: 'secret configuration' };
  const response = await api.POST(post({ action: 'import', words: [draft] }));
  assert.equal(response.status, 503);
  const body = await response.text();
  assert.ok(!body.includes('private vocabulary') && !body.includes('secret configuration'));
});

 test('same-site writes accept the public Host when Next uses an internal request URL',async()=>{const api=fixture();const req=new Request('http://localhost:3000/api/words',{method:'POST',headers:{host:'wordnest.example',origin:'https://wordnest.example','content-type':'application/json'},body:JSON.stringify({action:'import',words:[draft]})});assert.equal((await api.POST(req)).status,200);});
