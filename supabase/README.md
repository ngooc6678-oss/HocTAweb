# Wordnest database

Apply `migrations/202610030001_wordnest.sql` once to the Supabase project, either through the Supabase SQL Editor or a linked Supabase CLI migration. The migration runs in a transaction and intentionally fails if `public.words` already exists; inspect any existing table before attempting to replace it.

The app uses a normal Supabase publishable key together with the signed-in user's session. It does not need a service-role key. `words` has row-level security for every operation. Anonymous visitors receive no table grants; signed-in users may read, insert and delete their own rows, and update only `known`. Deleting a Supabase Auth account deletes that account's vocabulary through the foreign key.

The deduplication key is SHA-256 of the same normalized term/meaning pair used by the earlier app. Import and restore use `ON CONFLICT (user_id, word_key) DO NOTHING`, preserving existing dates and learned status. Original creation times are Unix milliseconds, so the week grouping remains unchanged after restoring a local backup.

## Verification

After applying the migration, run `tests/words-rls.sql` in the SQL Editor as the database owner. It creates two temporary test users inside a transaction, tests ownership and grants, then rolls everything back. A failing assertion raises an error. These checks should also run in a test database before changing policies.

Run application boundary tests from the project root with Node 22.13 or newer:

```sh
node --experimental-strip-types --loader ./tests/typescript-loader.mjs --test tests/word-api.test.mjs
```

The tests check anonymous access, forged ownership, UTF-8 request limits, duplicate restore behavior, long Vietnamese meanings, and pagination beyond 1,000 words. They use a query double without RLS to verify the API's independent ownership filters; the SQL test verifies the actual database rules.

## API limits

- `GET /api/words` returns at most 50 words and `nextCursor`. Follow `?cursor=...` until `nextCursor` is `null`. Ordering uses `(created_at, id)` rather than offsets, so removing already-read words does not skip the next page. Each page remains below the hosting response-size limit for the supported fields.
- POST bodies must be JSON and no more than 4,000,000 UTF-8 bytes. The UI submits at most 50 words at a time. The API accepts import batches up to 500 and restore batches up to 100.
- Restoration preserves original dates and status for newly restored words. Existing words remain unchanged. Retrying after an interrupted restore safely skips the words already stored.
- Backup files contain personal vocabulary. Keep them out of GitHub and public website assets.

Do not roll back by dropping `words` after real data has been imported. Export a backup first and use a new forward migration for future schema changes.

References: [Supabase row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security), [upsert](https://supabase.com/docs/reference/javascript/upsert), [pagination](https://supabase.com/docs/reference/javascript/range).
