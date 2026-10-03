begin;

create table public.words (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  term text not null check (char_length(term) <= 200 and char_length(btrim(term)) >= 1),
  meaning text not null check (char_length(meaning) <= 2000 and char_length(btrim(meaning)) >= 1),
  synonyms text not null default '' check (char_length(synonyms) <= 2000),
  example text not null default '' check (char_length(example) <= 5000),
  word_key text not null check (word_key ~ '^[0-9a-f]{64}$'),
  known smallint not null default 0 check (known in (0, 1)),
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint
    check (created_at > 0 and created_at <= 9007199254740991),
  constraint words_id_format check (id ~ '^[A-Za-z0-9_-]{1,100}$'),
  constraint words_user_key unique (user_id, word_key)
);

create index words_user_created_id on public.words (user_id, created_at, id);
alter table public.words enable row level security;
alter table public.words force row level security;

-- Supabase projects may grant broad privileges by default. Revoke them explicitly.
revoke all on table public.words from public, anon, authenticated;
grant select, insert, delete on table public.words to authenticated;
grant update (known) on table public.words to authenticated;

create policy words_select_own on public.words for select to authenticated
  using ((select auth.uid()) = user_id);
create policy words_insert_own on public.words for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy words_update_own on public.words for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy words_delete_own on public.words for delete to authenticated
  using ((select auth.uid()) = user_id);

comment on table public.words is 'Private Wordnest vocabulary; client access is restricted by auth.uid().';
comment on column public.words.word_key is 'SHA-256 of NFKC/lowercase/whitespace-normalized term + U+001F + meaning.';
comment on column public.words.created_at is 'Original time added, in Unix milliseconds. Preserved during backup restore.';

commit;
