-- Reconstructed from production catalog metadata on 2026-09-15.
-- For NEW Supabase test projects only; existing production already has these objects.
-- Secrets, cron jobs, extension configuration and user data are deliberately excluded.
begin;
create table public."app_config" (
  "key" text not null,
  "value" text not null
);
create table public."cardio_sessions" (
  "id" uuid default gen_random_uuid() not null,
  "workout_type" text not null,
  "completed_at" timestamp with time zone default now() not null,
  "notes" text,
  "created_at" timestamp with time zone default now() not null,
  "duration_min" numeric,
  "rpe" smallint,
  "user_id" uuid default auth.uid(),
  "focus" text,
  "class_name" text,
  "points" integer,
  "rebounds" integer
);
create table public."push_subscriptions" (
  "id" bigint generated ALWAYS as identity not null,
  "user_id" uuid default auth.uid(),
  "subscription" jsonb not null,
  "endpoint" text generated always as ((subscription ->> 'endpoint'::text)) stored,
  "created_at" timestamp with time zone default now() not null
);
create table public."supplement_log" (
  "id" bigint generated ALWAYS as identity not null,
  "supplement_id" bigint not null,
  "taken_on" date default CURRENT_DATE not null,
  "logged_at" timestamp with time zone default now(),
  "user_id" uuid default auth.uid()
);
create table public."supplements" (
  "id" bigint generated ALWAYS as identity not null,
  "name" text not null,
  "active" boolean default true not null,
  "sort_order" integer default 0 not null,
  "created_at" timestamp with time zone default now(),
  "user_id" uuid default auth.uid()
);
create table public."weight_log" (
  "id" bigint generated ALWAYS as identity not null,
  "weight" numeric not null,
  "logged_at" timestamp with time zone default now(),
  "user_id" uuid default auth.uid()
);
create table public."workouts" (
  "id" bigint generated ALWAYS as identity not null,
  "session_name" text,
  "color" text,
  "total_volume" numeric default 0,
  "exercises" jsonb,
  "logged_at" timestamp with time zone default now(),
  "user_id" uuid default auth.uid()
);
alter table public."app_config" add constraint "app_config_pkey" PRIMARY KEY (key);
alter table public."cardio_sessions" add constraint "cardio_sessions_pkey" PRIMARY KEY (id);
alter table public."push_subscriptions" add constraint "push_subscriptions_endpoint_key" UNIQUE (endpoint);
alter table public."push_subscriptions" add constraint "push_subscriptions_pkey" PRIMARY KEY (id);
alter table public."supplement_log" add constraint "supplement_log_pkey" PRIMARY KEY (id);
alter table public."supplement_log" add constraint "supplement_log_supplement_id_taken_on_key" UNIQUE (supplement_id, taken_on);
alter table public."supplements" add constraint "supplements_pkey" PRIMARY KEY (id);
alter table public."weight_log" add constraint "weight_log_pkey" PRIMARY KEY (id);
alter table public."workouts" add constraint "workouts_pkey" PRIMARY KEY (id);
alter table public."cardio_sessions" add constraint "cardio_sessions_rpe_check" CHECK (((rpe IS NULL) OR ((rpe >= 1) AND (rpe <= 10))));
alter table public."cardio_sessions" add constraint "cardio_sessions_workout_type_check" CHECK ((workout_type = ANY (ARRAY['tabata'::text, 'long_interval'::text, 'game'::text, 'cross_training'::text])));
alter table public."cardio_sessions" add constraint "cardio_sessions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id);
alter table public."push_subscriptions" add constraint "push_subscriptions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id);
alter table public."supplement_log" add constraint "supplement_log_supplement_id_fkey" FOREIGN KEY (supplement_id) REFERENCES supplements(id) ON DELETE CASCADE;
alter table public."supplement_log" add constraint "supplement_log_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id);
alter table public."supplements" add constraint "supplements_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id);
alter table public."weight_log" add constraint "weight_log_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id);
alter table public."workouts" add constraint "workouts_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id);
alter table public."app_config" enable row level security;
alter table public."cardio_sessions" enable row level security;
alter table public."push_subscriptions" enable row level security;
alter table public."supplement_log" enable row level security;
alter table public."supplements" enable row level security;
alter table public."weight_log" enable row level security;
alter table public."workouts" enable row level security;
create policy "owner all" on public."workouts" for ALL to "public" using ((auth.uid() = user_id)) with check ((auth.uid() = user_id));
create policy "owner all" on public."weight_log" for ALL to "public" using ((auth.uid() = user_id)) with check ((auth.uid() = user_id));
create policy "own subscriptions delete" on public."push_subscriptions" for DELETE to "public" using ((auth.uid() = user_id));
create policy "own subscriptions insert" on public."push_subscriptions" for INSERT to "public" with check ((auth.uid() = user_id));
create policy "own subscriptions select" on public."push_subscriptions" for SELECT to "public" using ((auth.uid() = user_id));
create policy "owner all" on public."supplements" for ALL to "public" using ((auth.uid() = user_id)) with check ((auth.uid() = user_id));
create policy "owner all" on public."supplement_log" for ALL to "public" using ((auth.uid() = user_id)) with check ((auth.uid() = user_id));
create policy "owner all" on public."cardio_sessions" for ALL to "public" using ((auth.uid() = user_id)) with check ((auth.uid() = user_id));
CREATE INDEX supplement_log_taken_on_idx ON public.supplement_log USING btree (taken_on);
CREATE INDEX cardio_sessions_completed_at_idx ON public.cardio_sessions USING btree (completed_at DESC);
grant select,insert,update,delete on public.workouts,public.weight_log,public.cardio_sessions,public.supplements,public.supplement_log,public.push_subscriptions to authenticated;
grant usage,select on all sequences in schema public to authenticated;
revoke all on public.app_config from anon,authenticated;
grant all on all tables in schema public to service_role;
commit;
