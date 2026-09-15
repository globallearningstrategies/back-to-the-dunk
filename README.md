# Back to the Dunk / The Work

A personal training, nutrition and progress app built with React, Supabase and Vercel.

## Development

Use Node 22 or later. Run `npm ci`, configure the public Supabase URL and publishable/anon key using `.env.example`, then run `npm start`. Never put a service-role key or external-service password in `REACT_APP_*` variables.

Run `npm run lint`, `npm test -- --runInBand`, and `npm run build`. GitHub Actions runs these checks on pushes and pull requests. Tests use isolated fixtures and do not send login emails or reminders.

## Code layout

- `src/App.js`: authentication boundary, navigation and logging orchestration.
- `src/auth.js`: email-code sign-in.
- `src/data/`: account-filtered queries, checked mutations, persistent drafts, cloud syncing and tests.
- `src/model.js`: training calculations, constants and design tokens.
- `src/ui.js`: shared controls and notifications.
- `src/training.js`, `statistics.js`, `nutrition.js`, `logging.js`, `home.js`: feature screens.

## Reliability and syncing

History loads in ordered, account-filtered pages. Lifetime statistics use complete history; a failed page shows a retry screen instead of partial totals. Writes check errors and returned rows. Failed deletes retain entries, failed edits stay open, and repeated submissions are guarded while a write is pending. Undo restores generated IDs correctly.

Workout selections, weights and dates persist under an account-specific browser key. Reopening offers **Resume workout**. Signing out unmounts account state.

Nutrition, body settings, supplements, schedules, check-ins and fitness-test history sync through `public.user_state`. Most records are separate per day or property, so an edit to one day cannot overwrite another day. Simultaneous edits to the same field use the latest successful write. Pending edits remain on the originating device and retry on focus, reconnect, and every 30 seconds. Keep that browser's storage until pending changes sync.

### Import existing browser data

After signing in on the original device, choose **Import my saved data** only if those records belong to the current account. Import fills missing cloud fields, preserves existing cloud values and deletion markers, and marks the legacy data as claimed on that browser. It preserves the original browser records. Other devices load the imported records after syncing.

See [Supabase operations](supabase/README.md) for migration and backend details.
