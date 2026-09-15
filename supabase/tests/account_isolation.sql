-- Run as the database owner. Fixtures and assertions are rolled back together.
begin;
create temporary table test_accounts (a uuid, b uuid);
insert into test_accounts values (gen_random_uuid(), gen_random_uuid());
grant select on test_accounts to authenticated;
insert into auth.users(id) select a from test_accounts union all select b from test_accounts;
insert into public.user_state(user_id,key,value) select a,'protein:test','150'::jsonb from test_accounts;
insert into public.user_state(user_id,key,value) select b,'protein:test','80'::jsonb from test_accounts;

set local role authenticated;
select set_config('request.jwt.claim.sub',(select a::text from test_accounts),true);
do $$ begin
  if (select count(*) from public.user_state where key='protein:test') <> 1 then raise exception 'Cross-account read'; end if;
  if (select value from public.user_state where key='protein:test') <> '150'::jsonb then raise exception 'Wrong owner data'; end if;
  update public.user_state set value='160'::jsonb where key='protein:test';
  if not found then raise exception 'Owner update failed'; end if;
  begin
    insert into public.user_state(user_id,key,value) select b,'forbidden','1'::jsonb from test_accounts;
    raise exception 'Cross-account insert allowed';
  exception when insufficient_privilege then null; end;
  begin
    update public.user_state set user_id=(select b from test_accounts) where key='protein:test';
    raise exception 'Ownership transfer allowed';
  exception when insufficient_privilege then null; end;
  delete from public.user_state where user_id=(select b from test_accounts);
  if found then raise exception 'Cross-account delete allowed'; end if;
  insert into public.user_state(key,value) values ('deleted-entry',null);
  if not found then raise exception 'Deletion tombstone failed'; end if;
end $$;

select set_config('request.jwt.claim.sub',(select b::text from test_accounts),true);
do $$ begin
  if (select value from public.user_state where key='protein:test') <> '80'::jsonb then raise exception 'Other account changed'; end if;
  delete from public.user_state where key='protein:test';
  if not found then raise exception 'Owner delete failed'; end if;
end $$;
set local role anon;
do $$ begin
  begin
    perform 1 from public.user_state;
    raise exception 'Anonymous read allowed';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
