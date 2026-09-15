begin;

-- One record per account and logical field/day avoids overwriting another day's
-- nutrition edits when two devices sync. JSON null is a deletion tombstone.
create table public.user_state (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  key text not null check (length(key) between 1 and 200),
  value jsonb,
  primary key (user_id, key)
);
alter table public.user_state enable row level security;
revoke all on public.user_state from anon;
grant select, insert, update, delete on public.user_state to authenticated;
grant all on public.user_state to service_role;
create policy "owner state" on public.user_state for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create index if not exists workouts_user_logged_idx on public.workouts (user_id, logged_at desc, id desc);
create index if not exists weight_log_user_logged_idx on public.weight_log (user_id, logged_at desc, id desc);
create index if not exists cardio_sessions_user_completed_idx on public.cardio_sessions (user_id, completed_at desc, id desc);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);
create index if not exists supplements_user_idx on public.supplements (user_id);
create index if not exists supplement_log_user_taken_idx on public.supplement_log (user_id, taken_on);

alter policy "owner all" on public.workouts to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "owner all" on public.weight_log to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "owner all" on public.cardio_sessions to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "owner all" on public.supplements to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "owner all" on public.supplement_log to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "own subscriptions select" on public.push_subscriptions to authenticated using ((select auth.uid()) = user_id);
alter policy "own subscriptions insert" on public.push_subscriptions to authenticated with check ((select auth.uid()) = user_id);
alter policy "own subscriptions delete" on public.push_subscriptions to authenticated using ((select auth.uid()) = user_id);

commit;
