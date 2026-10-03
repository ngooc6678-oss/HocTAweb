import { createHash, randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { validateBackup } from './backup';
import { keyOf, type Draft, type Word } from './vocabulary';
import { hasSameOrigin } from './request-origin';

export const MAX_REQUEST_BYTES = 4_000_000;
export const WORD_PAGE_SIZE = 50;
const MAX_RESTORE_WORDS = 100;
const WORD_COLUMNS = 'id,term,meaning,synonyms,example,known,created_at';
const ID_PATTERN = /^[A-Za-z0-9_-]{1,100}$/;
const fields: [keyof Draft, number][] = [
  ['term', 200], ['meaning', 2000], ['synonyms', 2000], ['example', 5000],
];

type Row = Draft & { id: string; known: number; created_at: number };
type Cursor = { createdAt: number; id: string };
type ClientFactory = () => Promise<SupabaseClient>;
type Dependencies = { now?: () => number; uuid?: () => string };

class InputError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

const json = (data: unknown, status = 200) => Response.json(data, {
  status,
  headers: { 'Cache-Control': 'private, no-store' },
});

// Hashing keeps the unique index bounded even when the Vietnamese meaning is long.
export function wordKey(word: Draft) {
  return createHash('sha256').update(keyOf(word), 'utf8').digest('hex');
}

function encodeCursor(row: Row) {
  return Buffer.from(JSON.stringify({ createdAt: Number(row.created_at), id: row.id })).toString('base64url');
}

function decodeCursor(raw: string | null): Cursor | null {
  if (raw === null) return null;
  try {
    if (!raw || raw.length > 256 || !/^[A-Za-z0-9_-]+$/.test(raw)) throw new Error();
    const value = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
    if (!value || !Number.isSafeInteger(value.createdAt) || value.createdAt <= 0 ||
      typeof value.id !== 'string' || !ID_PATTERN.test(value.id)) throw new Error();
    return { createdAt: value.createdAt, id: value.id };
  } catch {
    throw new InputError('Vị trí tải từ không hợp lệ. Hãy tải lại trang.');
  }
}

async function readJson(req: Request): Promise<Record<string, unknown>> {
  if (!req.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    throw new InputError('Yêu cầu cần có nội dung JSON.', 415);
  }
  const declaredSize = Number(req.headers.get('content-length'));
  if (declaredSize > MAX_REQUEST_BYTES) throw new InputError('Dữ liệu quá lớn. Hãy chia thành phần nhỏ hơn 4 MB.', 413);
  const reader = req.body?.getReader();
  if (!reader) throw new InputError('Dữ liệu không hợp lệ.');
  const chunks: Uint8Array[] = [];
  let byteLength = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      byteLength += value.byteLength;
      if (byteLength > MAX_REQUEST_BYTES) {
        await reader.cancel();
        throw new InputError('Dữ liệu quá lớn. Hãy chia thành phần nhỏ hơn 4 MB.', 413);
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(byteLength);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    const data = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error();
    return data;
  } catch (error) {
    if (error instanceof InputError) throw error;
    throw new InputError('Dữ liệu không hợp lệ.');
  } finally {
    reader.releaseLock();
  }
}

function validateImport(input: unknown): Draft[] {
  if (!Array.isArray(input) || input.length < 1 || input.length > 500) {
    throw new InputError('Mỗi lần nhập từ 1 đến 500 từ.');
  }
  return input.map((raw: unknown) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new InputError('Cần có từ, nghĩa và nội dung đúng định dạng.');
    const value = raw as Record<string, unknown>;
    if (!fields.every(([key, limit]) => typeof value[key] === 'string' && value[key].length <= limit && !value[key].includes('\u0000')) ||
      !(value.term as string).trim() || !(value.meaning as string).trim()) {
      throw new InputError('Cần có từ, nghĩa và nội dung đúng định dạng.');
    }
    return {
      term: (value.term as string).trim(), meaning: (value.meaning as string).trim(),
      synonyms: (value.synonyms as string).trim(), example: (value.example as string).trim(),
    };
  });
}

function safeLog(operation: string, error: unknown) {
  // Database error details may contain vocabulary; never write them to hosting logs.
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : 'unavailable';
  console.error(`Wordnest ${operation}: ${code}`);
}

export function createWordHandlers(createClient: ClientFactory, dependencies: Dependencies = {}) {
  const now = dependencies.now ?? Date.now;
  const uuid = dependencies.uuid ?? randomUUID;

  async function authenticate() {
    const client = await createClient();
    // Verify the session with Supabase Auth rather than trusting a cookie payload.
    const { data: { user }, error } = await client.auth.getUser();
    return error || !user ? null : { client, userId: user.id };
  }

  return {
    async GET(req: Request) {
      try {
        const session = await authenticate();
        if (!session) return json({ error: 'Đăng nhập để lưu bộ từ của bạn.' }, 401);
        const cursor = decodeCursor(new URL(req.url).searchParams.get('cursor'));
        let query = session.client.from('words').select(WORD_COLUMNS)
          .eq('user_id', session.userId).order('created_at').order('id').limit(WORD_PAGE_SIZE + 1);
        if (cursor) {
          // The cursor ID is limited to safe ASCII characters before composing this filter.
          query = query.or(`created_at.gt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.gt.${cursor.id})`);
        }
        const { data, error } = await query;
        if (error) throw error;
        const rows = (data ?? []) as Row[];
        const page = rows.slice(0, WORD_PAGE_SIZE);
        const words: Word[] = page.map(({ created_at, ...word }) => ({ ...word, createdAt: Number(created_at) }));
        return json({ words, nextCursor: rows.length > WORD_PAGE_SIZE ? encodeCursor(page[page.length - 1]) : null });
      } catch (error) {
        if (error instanceof InputError) return json({ error: error.message }, error.status);
        safeLog('load words', error);
        return json({ error: 'Chưa tải được bộ từ. Vui lòng thử lại.' }, 503);
      }
    },

    async POST(req: Request) {
      try {
        const session = await authenticate();
        if (!session) return json({ error: 'Đăng nhập để lưu bộ từ của bạn.' }, 401);
        if (!hasSameOrigin(req)) {
          return json({ error: 'Yêu cầu không hợp lệ.' }, 403);
        }
        const data = await readJson(req);
        const { client, userId } = session;
        if (data.action === 'import' || data.action === 'restore') {
          let words;
          if (data.action === 'restore') {
            try { words = validateBackup(data.backup, now()); }
            catch (error) { throw new InputError((error as Error).message); }
            if (words.length > MAX_RESTORE_WORDS) throw new InputError('Mỗi phần khôi phục tối đa 100 từ.');
          } else {
            const importedAt = now();
            words = validateImport(data.words).map(word => ({ ...word, known: 0, createdAt: importedAt }));
          }
          const batchId = uuid();
          const rows = words.map((word, index) => ({
            id: `${batchId}-${String(index).padStart(3, '0')}`, user_id: userId,
            term: word.term, meaning: word.meaning, synonyms: word.synonyms, example: word.example,
            word_key: wordKey(word), known: word.known, created_at: word.createdAt,
          }));
          // DO NOTHING is essential: re-importing must not erase dates or learned status.
          const { data: inserted, error } = await client.from('words')
            .upsert(rows, { onConflict: 'user_id,word_key', ignoreDuplicates: true }).select('id');
          if (error) throw error;
          const added = inserted?.length ?? 0;
          return json({ added, skipped: words.length - added });
        }
        if (typeof data.id !== 'string' || !ID_PATTERN.test(data.id)) throw new InputError('Từ được chọn không hợp lệ.');
        if (data.action === 'known' && typeof data.known === 'boolean') {
          const { data: updated, error } = await client.from('words').update({ known: data.known ? 1 : 0 })
            .eq('id', data.id).eq('user_id', userId).select('id');
          if (error) throw error;
          return updated?.length ? json({ ok: true }) : json({ error: 'Từ này không còn trong bộ từ. Hãy tải lại trang.' }, 404);
        }
        if (data.action === 'delete') {
          const { data: deleted, error } = await client.from('words').delete()
            .eq('id', data.id).eq('user_id', userId).select('id');
          if (error) throw error;
          return deleted?.length ? json({ ok: true }) : json({ error: 'Từ này không còn trong bộ từ. Hãy tải lại trang.' }, 404);
        }
        throw new InputError('Thao tác không hợp lệ.');
      } catch (error) {
        if (error instanceof InputError) return json({ error: error.message }, error.status);
        safeLog('save words', error);
        return json({ error: 'Chưa lưu được thay đổi. Bạn có thể thử lại; các từ đã có sẽ được giữ nguyên.' }, 503);
      }
    },
  };
}
