# Supabase operations

## Applied migration

`migrations/20260915145746_user_data_sync_and_indexes.sql` matches the version recorded in production. It adds account-owned cloud state, six user-reference indexes and eight optimized policies. Existing training data is preserved.

The migration passed a rolled-back rehearsal with `tests/account_isolation.sql`. The test also passed after applying the migration. It verifies owner reads/writes, cross-account denial, ownership-transfer denial, anonymous-access denial and deletion markers. Fixtures are rolled back; no email or push endpoints are invoked. Run as database owner with a SQL client that stops on errors.

Supabase advisors confirmed that the missing-user-index and repeated-auth-function findings cleared. New indexes may remain marked unused until real traffic uses them.

## Schema reference

`schema-baseline.json` captures pre-change public database metadata. `schema-baseline.sql` reconstructs it for a **new disposable Supabase project**; do not apply it over production. For a new test project, apply that reference first, then the migration. User data, secrets, cron commands and platform-managed schemas are excluded.

Older production migrations predate this snapshot. Compare remote migration history before pushing or repairing migrations; the new migration is already applied.

## Edge Functions

The four deployed functions are versioned under `functions/`, with JWT-verification settings in `config.toml`. They were not invoked or redeployed in this release. Source now accepts `VAPID_SUBJECT`, falling back to the project URL instead of embedding a personal email.

Keep Weight Gurus credentials, the service-role key and VAPID keys in Supabase. `app_config` intentionally has RLS without client policies. Never commit secret-bearing cron commands.

Before a future backend redeployment, review scheduler authorization and ownership assumptions. The captured Weight Gurus job chooses the first auth user, and the engine reminder aggregates across accounts. These existing scheduled jobs were not redesigned in this frontend/database reliability release. Multiple-user scheduling requires explicit owner mapping and per-user aggregation.

## Remaining advisor notices

`pg_net` reports `extrelocatable = false`; it cannot be moved using `ALTER EXTENSION ... SET SCHEMA`. Reinstalling it can disrupt cron/reminders, so it was preserved. Address this with a dependency-aware backup and maintenance window.

Leaked-password protection is disabled; the UI uses email codes. Revisit before enabling passwords. Fixed Auth connection allocation is an informational scaling notice.

## Release and rollback

Apply database additions before their frontend; this migration is already applied. A frontend rollback can retain the new table and indexes, preserving cloud records. Do not drop `user_state` as a rollback.

The connected Vercel account did not expose this project, although GitHub records prior Vercel deployment status. Verify the new commit's deployment status and the deployed app before declaring the release live.
