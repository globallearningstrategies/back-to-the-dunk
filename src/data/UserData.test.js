import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { UserDataProvider, useUserData } from './UserData';
import { useWorkoutDraft } from './useWorkoutDraft';
import { supabase } from './client';
import { fetchAll } from './records';
import { accountKey } from './storage';
jest.mock('./client', () => ({ supabase: { from: jest.fn() } }));
jest.mock('./records', () => ({ fetchAll: jest.fn() }));
let root, container, api, draft, remote, fail, upsert;
function Probe() { api = useUserData(); return <span>{JSON.stringify(api.get('protein', {}))}</span>; }
function Draft({ userId }) { draft = useWorkoutDraft(userId, '2026-09-15T10:00'); return <span>{JSON.stringify(draft.checked)}</span>; }
async function flush(fn) { await act(async () => { if (fn) fn(); for (let i=0;i<20;i++) await Promise.resolve(); }); }
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear(); remote = {}; fail = false;
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
  upsert = jest.fn(async rows => {
    if (fail) return { error: new Error('offline') };
    for (const r of rows) (remote[r.user_id] ??= {})[r.key] = r.value;
    return {};
  });
  supabase.from.mockReturnValue({ upsert });
  fetchAll.mockImplementation(async (_client,_table,user) => Object.entries(remote[user] || {}).map(([key,value]) => ({key,value})));
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });
const mount = user => flush(() => root.render(<UserDataProvider key={user} userId={user}><Probe /></UserDataProvider>));
test('failed edits remain pending, retry persists them, another device loads them', async () => {
  await mount('alice'); expect(api.ready).toBe(true);
  fail = true;
  await flush(() => api.set('protein', { '2026-09-15': 150 }, {}));
  expect(api.error).toBe('offline');
  expect(JSON.parse(localStorage.getItem(accountKey('alice','pending')))).toEqual({ 'protein:2026-09-15': 150 });
  fail = false; await flush(() => api.retry());
  expect(api.error).toBe(''); expect(remote.alice['protein:2026-09-15']).toBe(150);
  localStorage.clear(); await mount('bob'); await mount('alice');
  expect(api.get('protein',{})).toEqual({ '2026-09-15': 150 });
});
test('account switch never renders or uploads another account’s cached records', async () => {
  remote.alice = { 'protein:2026-09-15': 150 };
  await mount('alice'); expect(container.textContent).toContain('150');
  await mount('bob'); expect(container.textContent).toBe('{}');
  await flush(() => api.set('protein', { '2026-09-15': 80 }, {}));
  expect(remote.alice['protein:2026-09-15']).toBe(150);
  expect(remote.bob['protein:2026-09-15']).toBe(80);
});
test('an edit arriving during a refresh is uploaded after the refresh completes', async () => {
  await mount('alice');
  let resolve;
  fetchAll.mockImplementationOnce(() => new Promise(r => { resolve = r; }));
  await flush(() => api.retry());
  await flush(() => api.set('protein', { today: 100 }, {}));
  await flush(() => resolve([]));
  expect(api.get('protein',{})).toEqual({ today: 100 });
  expect(remote.alice['protein:today']).toBe(100);
});
test('browser legacy data is not silently assigned and import does not overwrite cloud values', async () => {
  localStorage.setItem('bttd_protein_log_v1',JSON.stringify({ yesterday: 100, today: 150 }));
  remote.alice = { 'protein:today': 200 };
  await mount('alice'); expect(api.get('protein',{})).toEqual({ today: 200 });
  expect(api.legacyAvailable).toBe(true);
  await flush(() => api.importLegacy());
  expect(api.get('protein',{})).toEqual({ yesterday: 100, today: 200 });
  await mount('bob'); expect(api.legacyAvailable).toBe(false);
});
test('workout draft survives remount and stays separate for another account', async () => {
  await flush(() => root.render(<Draft key="alice" userId="alice" />));
  await flush(() => { draft.setChecked({ A_squat: true }); draft.setVals({ A_squat: { weight: '100' } }); });
  await flush(() => root.render(<Draft key="bob" userId="bob" />));
  expect(draft.checked).toEqual({});
  await flush(() => root.render(<Draft key="alice" userId="alice" />));
  expect(draft.checked).toEqual({ A_squat: true }); expect(draft.vals.A_squat.weight).toBe('100');
  expect(draft.resumed).toBe(true);
});
