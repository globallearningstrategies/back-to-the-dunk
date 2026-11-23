/* Offline outbox for table writes (games, sessions, walks, lifts, weigh-ins).
   When a write fails because there's no connection, it's queued here (saved on
   the device) and the screen shows the entry straight away, marked pending.
   The queue is replayed in order once the connection is back.

   Cardio sessions get a client-generated UUID on insert, so a queued game keeps
   the same id after it syncs (court ratings and legs check-ins are keyed by it).
   Workouts and weigh-ins use server-generated numeric ids, so queued inserts get
   a temporary "local-…" id that is swapped for the real row when it syncs. */
import { accountKey, readJSON, writeJSON } from './storage';

export const TIME_FIELD = { cardio_sessions: 'completed_at', workouts: 'logged_at', weight_log: 'logged_at' };
export const isLocalId = id => typeof id === 'string' && id.startsWith('local-');
const rand = () => Math.random().toString(36).slice(2, 10);
export const newUUID = () => (typeof crypto !== 'undefined' && crypto.randomUUID)
  ? crypto.randomUUID()
  : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16); });

export function isNetworkError(error, online = typeof navigator === 'undefined' ? true : navigator.onLine) {
  if (online === false) return true;
  if (!error) return false;
  if (error.name === 'TypeError') return true;
  return /failed to fetch|network ?error|load failed|networkrequestfailed|fetch failed|the internet connection appears to be offline/i.test(String(error.message || error));
}

export const outboxKey = userId => accountKey(userId, 'outbox');
export const readOutbox = userId => readJSON(outboxKey(userId), []);
export const writeOutbox = (userId, ops) => writeJSON(outboxKey(userId), ops);

// Queue a write and return { ops, row } — the new queue and the row to show now.
export function enqueue(ops, { table, operation, payload, id, current, userId, now = new Date() }) {
  const opId = `op-${Date.now().toString(36)}-${rand()}`;
  if (operation === 'insert') {
    const rowId = payload.id ?? `local-${Date.now().toString(36)}-${rand()}`;
    const time = TIME_FIELD[table];
    const body = { ...payload, ...(time && !payload[time] ? { [time]: now.toISOString() } : {}) };
    const row = { ...body, id: rowId, user_id: userId, _pending: true };
    return { ops: [...ops, { opId, table, operation, id: rowId, payload: body }], row };
  }
  if (operation === 'update') {
    const queuedInsert = ops.find(o => o.table === table && o.operation === 'insert' && String(o.id) === String(id));
    const row = { ...(current || {}), ...payload, id, _pending: true };
    if (queuedInsert) return { ops: ops.map(o => o === queuedInsert ? { ...o, payload: { ...o.payload, ...payload } } : o), row };
    return { ops: [...ops, { opId, table, operation, id, payload }], row };
  }
  // delete
  const queuedInsert = ops.find(o => o.table === table && o.operation === 'insert' && String(o.id) === String(id));
  if (queuedInsert) return { ops: ops.filter(o => String(o.id) !== String(id) || o.table !== table), row: current || { id } };
  return { ops: [...ops.filter(o => !(o.table === table && o.operation === 'update' && String(o.id) === String(id))), { opId, table, operation, id }], row: current || { id } };
}

// Show queued changes on top of rows loaded from the server.
export function applyOutbox(rows, table, ops, userId) {
  let out = rows.slice();
  for (const o of ops.filter(x => x.table === table)) {
    if (o.operation === 'insert') { if (!out.some(r => String(r.id) === String(o.id))) out.push({ ...o.payload, id: o.id, user_id: userId, _pending: true }); }
    else if (o.operation === 'update') out = out.map(r => String(r.id) === String(o.id) ? { ...r, ...o.payload, _pending: true } : r);
    else out = out.filter(r => String(r.id) !== String(o.id));
  }
  return out;
}

export const pendingCount = (ops, table) => ops.filter(o => !table || o.table === table).length;

/* Replay the queue in order. `send(op)` performs the real write and returns the
   server row (or null for deletes). Stops at the first network error, leaving
   the rest queued. A write the server rejects is dropped and reported through
   `onRejected` so one bad entry can't block everything behind it. */
export async function flushOutbox(ops, send, { onSynced, onRejected } = {}) {
  let remaining = ops.slice();
  while (remaining.length) {
    const op = remaining[0];
    try {
      const row = await send(op);
      remaining = remaining.slice(1);
      if (onSynced) onSynced(op, row, remaining);
    } catch (error) {
      if (isNetworkError(error)) return { remaining, stopped: true };
      remaining = remaining.slice(1);
      if (onRejected) onRejected(op, error, remaining);
    }
  }
  return { remaining, stopped: false };
}
