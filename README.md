# The Work — Build Your Engine

A personal basketball conditioning, training and nutrition app built with React, Supabase and Vercel. Engine is the central training-load metric; recorded court check-ins help relate it to personal game experience.

## Development

Use Node 22 or later. Run `npm ci`, configure the public Supabase URL and publishable/anon key using `.env.example`, then run `npm start`. Never put a service-role key or external-service password in `REACT_APP_*` variables.

Run `npm run lint`, `npm test -- --runInBand`, and `npm run build`. GitHub Actions runs these checks on pushes and pull requests. Tests use isolated fixtures and do not send login emails or reminders.

## Code layout

- `src/App.js`: authentication boundary, navigation and logging orchestration.
- `src/auth.js`: email-code sign-in.
- `src/data/`: account-filtered queries, checked mutations, persistent drafts, cloud syncing and tests.
- `src/model.js`: training calculations, constants and design tokens.
- `src/engine.js`, `src/engine-ui.js`, `src/engine.css`: Engine calculations, weekly goals, court check-ins and the main experience.
- `src/WorkoutFlow.js`: focused lifting and interval sessions, partial sets and timer recovery.
- `src/FoodJournal.js`: individual food entries, portions, favorites and repeat logging.
- `src/ui.js`: shared controls and notifications.
- `src/training.js`, `statistics.js`, `nutrition.js`, `logging.js`, `home.js`: feature screens.

## Reliability and syncing

History loads in ordered, account-filtered pages. Lifetime statistics use complete history; a failed page shows a retry screen instead of partial totals. Writes check errors and returned rows. Failed deletes retain entries, failed edits stay open, and repeated submissions are guarded while a write is pending. Undo restores generated IDs correctly.

Workout selections, weights and dates persist under an account-specific browser key. Reopening offers **Resume workout**. Signing out unmounts account state.

Focused workouts preserve per-set reps and weights, including partial sessions and swaps. Interval timers persist elapsed time and running timestamps; they resume across refreshes. Saving records actual elapsed minutes and the user's effort rating. Session records still require a successful server write; unsuccessful saves retain the draft.

## Engine experience

Today leads with the existing Engine score, its seven-day change, personal best and next action. The numerical formula is preserved: conditioning load is duration × effort, walks use half weight, and each day applies the existing 41/42 decay before adding load/42. Engine is a training-load model, not a measured fitness or readiness score. Recovery-day decreases are expected.

Weekly goals use Monday–Sunday. A target is saved per week, beginning when this version is opened. Changing this week's goal preserves previous saved goals. Motivation celebrates these goals and Engine milestones rather than daily training streaks.

Court ratings (Struggled, Solid, Strong) are separate from existing fourth-quarter-legs check-ins. Each game's comparison uses the Engine calculated before that game, excluding its own contribution and later sessions. Correcting historical training recalculates the comparison.

New food entries add to existing daily nutrition totals without migrating or duplicating them. Each entry and favorite has its own account-owned `user_state` key; portions, edits, deletes and undo update the derived totals. Preferences, weekly goals and court ratings use the same existing sync and isolation rules. No database schema change is needed for this release.

Nutrition, body settings, supplements, schedules, check-ins and fitness-test history sync through `public.user_state`. Most records are separate per day or property, so an edit to one day cannot overwrite another day. Simultaneous edits to the same field use the latest successful write. Pending edits remain on the originating device and retry on focus, reconnect, and every 30 seconds. Keep that browser's storage until pending changes sync.

### Import existing browser data

After signing in on the original device, choose **Import my saved data** only if those records belong to the current account. Import fills missing cloud fields, preserves existing cloud values and deletion markers, and marks the legacy data as claimed on that browser. It preserves the original browser records. Other devices load the imported records after syncing.

See [Supabase operations](supabase/README.md) for migration and backend details.
