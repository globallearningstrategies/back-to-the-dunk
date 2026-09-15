import { fetchAll, mutateRecord, restorePayload } from './records';

function pagedClient(rows, failOffset) {
  const query = { select: jest.fn(() => query), eq: jest.fn(() => query), order: jest.fn(() => query),
    abortSignal: jest.fn(() => query),
    range: jest.fn((a,b) => Promise.resolve(a === failOffset ? { error: new Error('offline') } : { data: rows.slice(a,b+1) })) };
  return { from: jest.fn(() => query), query };
}
test('loads all 1156 records and scopes every page to the signed-in account', async () => {
  const rows = Array.from({ length: 1156 }, (_,id) => ({ id }));
  const client = pagedClient(rows);
  expect(await fetchAll(client, 'weight_log', 'alice', 'logged_at')).toEqual(rows);
  expect(client.query.range.mock.calls).toEqual([[0,499],[500,999],[1000,1499]]);
  expect(client.query.eq.mock.calls).toEqual(Array(3).fill(['user_id','alice']));
});
test('does not truncate cardio lifetime history at 60', async () => {
  const rows = Array.from({ length: 90 }, (_,id) => ({ id }));
  expect(await fetchAll(pagedClient(rows), 'cardio_sessions', 'alice', 'completed_at')).toHaveLength(90);
});
test('does not return misleading partial totals if a later page fails', async () => {
  const client = pagedClient(Array(600).fill({ id: 1 }), 500);
  await expect(fetchAll(client, 'workouts', 'alice', 'logged_at')).rejects.toThrow('offline');
});
test('failed deletion rejects and a zero-row update is not a success', async () => {
  const query = { delete: jest.fn(() => query), update: jest.fn(() => query), eq: jest.fn(() => query), select: jest.fn(() => query),
    single: jest.fn().mockResolvedValueOnce({ error: new Error('offline') }).mockResolvedValueOnce({ data: null }) };
  const client = { from: () => query };
  await expect(mutateRecord(client,'alice','workouts','delete',null,42)).rejects.toThrow('offline');
  await expect(mutateRecord(client,'alice','workouts','update',{},42)).rejects.toThrow('no longer available');
  expect(query.eq).toHaveBeenCalledWith('user_id','alice');
});
test('undo removes generated integer IDs but preserves the cardio UUID', () => {
  expect(restorePayload({ id: 42, weight: 200 }, 'weight_log')).toEqual({ weight: 200 });
  expect(restorePayload({ id: 'uuid', rpe: 8 }, 'cardio_sessions')).toEqual({ id: 'uuid', rpe: 8 });
});
