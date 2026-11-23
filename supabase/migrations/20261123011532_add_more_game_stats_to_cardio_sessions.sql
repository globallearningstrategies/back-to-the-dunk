-- Applied to production 2026-11-23. Optional box-score stats for games.
alter table public.cardio_sessions
  add column if not exists assists integer,
  add column if not exists steals integer,
  add column if not exists threes_made integer;
alter table public.cardio_sessions
  add constraint cardio_sessions_assists_check check (assists is null or (assists >= 0 and assists <= 200)),
  add constraint cardio_sessions_steals_check check (steals is null or (steals >= 0 and steals <= 200)),
  add constraint cardio_sessions_threes_made_check check (threes_made is null or (threes_made >= 0 and threes_made <= 200));
