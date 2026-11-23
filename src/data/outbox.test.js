import { enqueue, applyOutbox, flushOutbox, isNetworkError, isLocalId } from './outbox';

test('recognises network failures but not server rejections', () => {
  expect(isNetworkError(new TypeError('Failed to fetch'), true)).toBe(true);
  expect(isNetworkError({ message: 'Load failed' }, true)).toBe(true);
  expect(isNetworkError({ message: 'anything' }, false)).toBe(true);
  expect(isNetworkError({ message: 'violates check constraint', code: '23514' }, true)).toBe(false);
});

test('queued inserts get a local id, edits fold into them, and deleting one drops it', () => {
  let r = enqueue([], { table: 'weight_log', operation: 'insert', payload: { weight: 214 }, userId: 'u', now: new Date('2026-11-23T10:00:00Z') });
  expect(isLocalId(r.row.id)).toBe(true);
  expect(r.row).toMatchObject({ weight: 214, logged_at: '2026-11-23T10:00:00.000Z', _pending: true });
  const id = r.row.id;
  r = enqueue(r.ops, { table: 'weight_log', operation: 'update', payload: { weight: 213.5 }, id, current: r.row, userId: 'u' });
  expect(r.ops).toHaveLength(1);
  expect(r.ops[0].payload.weight).toBe(213.5);
  r = enqueue(r.ops, { table: 'weight_log', operation: 'delete', id, current: r.row, userId: 'u' });
  expect(r.ops).toEqual([]);
});

test('cardio inserts keep their client id; updates and deletes of synced rows queue in order', () => {
  let r = enqueue([], { table: 'cardio_sessions', operation: 'insert', payload: { id: 'uuid-1', workout_type: 'game' }, userId: 'u' });
  expect(r.row.id).toBe('uuid-1');
  r = enqueue([], { table: 'workouts', operation: 'update', payload: { logged_at: 'x' }, id: 7, current: { id: 7, exercises: [1] }, userId: 'u' });
  expect(r.row).toEqual({ id: 7, exercises: [1], logged_at: 'x', _pending: true });
  r = enqueue(r.ops, { table: 'workouts', operation: 'delete', id: 7, current: r.row, userId: 'u' });
  expect(r.ops.map(o => o.operation)).toEqual(['delete']);
});

test('applyOutbox overlays queued changes on server rows', () => {
  const ops = [
    { table: 'weight_log', operation: 'insert', id: 'local-1', payload: { weight: 210, logged_at: 't' } },
    { table: 'weight_log', operation: 'update', id: 2, payload: { weight: 211 } },
    { table: 'weight_log', operation: 'delete', id: 3 },
    { table: 'workouts', operation: 'delete', id: 1 },
  ];
  const rows = applyOutbox([{ id: 1, weight: 215 }, { id: 2, weight: 212 }, { id: 3, weight: 213 }], 'weight_log', ops, 'u');
  expect(rows.map(r => [r.id, r.weight, !!r._pending])).toEqual([[1, 215, false], [2, 211, true], ['local-1', 210, true]]);
});

test('flush sends in order, stops on a network error and skips rejected entries', async () => {
  const ops = [{ opId: 'a' }, { opId: 'b' }, { opId: 'c' }];
  const synced = [], rejected = [];
  const send = jest.fn(async op => { if (op.opId === 'b') throw Object.assign(new Error('bad'), { code: '23514' }); if (op.opId === 'c') throw new TypeError('Failed to fetch'); return { ok: op.opId }; });
  const result = await flushOutbox(ops, send, { onSynced: op => synced.push(op.opId), onRejected: op => rejected.push(op.opId) });
  expect(synced).toEqual(['a']); expect(rejected).toEqual(['b']);
  expect(result).toEqual({ remaining: [{ opId: 'c' }], stopped: true });
});
