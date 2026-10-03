-- Run as the project database owner after the migration. All fixtures are rolled back.
begin;

insert into auth.users (id, email) values
  ('f0110000-0000-4000-8000-000000000001', 'wordnest-rls-a@example.invalid'),
  ('f0110000-0000-4000-8000-000000000002', 'wordnest-rls-b@example.invalid');

insert into public.words (id, user_id, term, meaning, word_key, known, created_at) values
  ('rls-user-a-word', 'f0110000-0000-4000-8000-000000000001', 'one', 'một', repeat('a', 64), 0, 1790989200000),
  ('rls-user-b-word', 'f0110000-0000-4000-8000-000000000002', 'two', 'hai', repeat('b', 64), 0, 1790989200000);

set local role anon;
do $$
begin
  begin
    perform 1 from public.words;
    raise exception 'FAIL: anon can read vocabulary';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.words (user_id, term, meaning, word_key)
      values ('f0110000-0000-4000-8000-000000000001', 'forged', 'sai', repeat('c', 64));
    raise exception 'FAIL: anon can insert vocabulary';
  exception when insufficient_privilege then null; end;
  begin
    update public.words set known = 1;
    raise exception 'FAIL: anon can update vocabulary';
  exception when insufficient_privilege then null; end;
  begin
    delete from public.words;
    raise exception 'FAIL: anon can delete vocabulary';
  exception when insufficient_privilege then null; end;
end $$;

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'f0110000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"f0110000-0000-4000-8000-000000000001","role":"authenticated"}', true);

do $$
declare affected integer;
begin
  if (select count(*) from public.words) <> 1 then raise exception 'FAIL: user A can see another account'; end if;
  if not exists(select 1 from public.words where id = 'rls-user-a-word') then raise exception 'FAIL: owner cannot read own word'; end if;

  update public.words set known = 1 where id = 'rls-user-b-word';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'FAIL: another account can be updated'; end if;
  delete from public.words where id = 'rls-user-b-word';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'FAIL: another account can be deleted'; end if;

  begin
    insert into public.words (user_id, term, meaning, word_key)
      values ('f0110000-0000-4000-8000-000000000002', 'forged', 'sai', repeat('c', 64));
    raise exception 'FAIL: forged ownership accepted';
  exception when insufficient_privilege then null; end;
  begin
    update public.words set user_id = 'f0110000-0000-4000-8000-000000000002' where id = 'rls-user-a-word';
    raise exception 'FAIL: ownership may be reassigned';
  exception when insufficient_privilege then null; end;
  begin
    update public.words set created_at = 1 where id = 'rls-user-a-word';
    raise exception 'FAIL: original import week can be changed directly';
  exception when insufficient_privilege then null; end;

  update public.words set known = 1 where id = 'rls-user-a-word';
  if not exists(select 1 from public.words where id = 'rls-user-a-word' and known = 1) then raise exception 'FAIL: owner cannot update learned status'; end if;

  insert into public.words (user_id, term, meaning, word_key, known)
    values ('f0110000-0000-4000-8000-000000000001', 'one', 'một', repeat('a', 64), 0)
    on conflict (user_id, word_key) do nothing;
  if not exists(select 1 from public.words where id = 'rls-user-a-word' and known = 1 and created_at = 1790989200000) then
    raise exception 'FAIL: duplicate import overwrote learned status or original date';
  end if;

  insert into public.words (id, user_id, term, meaning, word_key)
    values ('rls-long-meaning', 'f0110000-0000-4000-8000-000000000001', 'long', repeat('ế', 2000), repeat('d', 64));
  if not exists(select 1 from public.words where id = 'rls-long-meaning') then raise exception 'FAIL: long Vietnamese meaning was not accepted'; end if;
  begin
    update public.words set known = 2 where id = 'rls-long-meaning';
    raise exception 'FAIL: invalid known state accepted';
  exception when check_violation then null; end;
  delete from public.words where id = 'rls-long-meaning';
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'FAIL: owner cannot delete own word'; end if;
end $$;

reset role;
do $$
begin
  if not exists(select 1 from public.words where id = 'rls-user-b-word' and known = 0) then raise exception 'FAIL: user B data changed'; end if;
  raise notice 'PASS: Wordnest table grants, ownership policies, constraints and duplicate handling';
end $$;

rollback;
