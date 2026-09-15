import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { supabase } from './data/client';
import { fetchAll } from './data/records';
jest.mock('./data/client', () => ({ supabase: { auth: { onAuthStateChange: jest.fn(), getSession: jest.fn(), signOut: jest.fn() }, from: jest.fn() } }));
jest.mock('./data/records', () => ({ ...jest.requireActual('./data/records'), fetchAll: jest.fn() }));
let root, div, authChange;
async function flush(fn) { await act(async () => { if(fn) fn(); for(let i=0;i<30;i++) await Promise.resolve(); }); }
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear(); window.scrollTo = jest.fn();
  supabase.auth.onAuthStateChange.mockImplementation(fn => { authChange=fn; return { data: { subscription: { unsubscribe: jest.fn() } } }; });
  supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'alice', email: 'alice@example.test' } } } });
  fetchAll.mockImplementation(async (_client,table) => table === 'user_state' ? [{ key: 'protein:2026-09-15', value: 150 }] : []);
  div=document.createElement('div'); document.body.appendChild(div); root=createRoot(div);
});
afterEach(async () => { await act(async () => root.unmount()); div.remove(); });
async function click(label) {
  const button=[...div.querySelectorAll('button')].find(b=>b.textContent.trim()===label || b.textContent.trim().endsWith(label));
  expect(button).toBeTruthy(); await flush(()=>button.click());
}
test('signed-in app renders Today, Train, Progress, and Fuel after module extraction', async () => {
  await flush(()=>root.render(<App />));
  expect(div.textContent).toContain('Synced');
  await click('Train'); expect(div.textContent).toContain('Log');
  await click('Progress');
  await click('Fuel'); expect(div.textContent).toContain('Nutrition');
  await click('Train'); await click('Plan'); expect(div.textContent).toContain('alice@example.test');
  await flush(()=>authChange('SIGNED_OUT',null));
  expect(div.textContent).toContain('Sign in to continue');
  expect(div.textContent).not.toContain('alice@example.test');
});
test('history failure shows a retry screen rather than empty statistics', async () => {
  fetchAll.mockImplementation(async (_client,table) => { if(table==='workouts') throw new Error('Connection interrupted'); return []; });
  await flush(()=>root.render(<App />));
  expect(div.textContent).toContain('Connection interrupted');
  expect(div.textContent).toContain('Retry loading');
});
test('a failed delete keeps the weight entry visible and displays the error', async () => {
  const row={ id:42, weight:210, logged_at:new Date().toISOString() };
  fetchAll.mockImplementation(async (_client,table) => table==='weight_log' ? [row] : []);
  const query={ delete:jest.fn(()=>query), eq:jest.fn(()=>query), select:jest.fn(()=>query), single:jest.fn().mockResolvedValue({error:new Error('offline')}) };
  supabase.from.mockReturnValue(query);
  await flush(()=>root.render(<App />)); await click('Progress'); await click('Weight');
  await flush(()=>div.querySelector('[aria-label="Delete weight entry"]').click());
  expect(div.querySelector('[aria-label="Delete weight entry"]')).toBeTruthy();
  expect(div.textContent).toContain('offline');
  expect(div.textContent).not.toContain('Entry deleted');
});
test('delete and undo restore the entry using a fresh generated ID', async () => {
  const row={ id:42, weight:210, logged_at:new Date().toISOString() };
  fetchAll.mockImplementation(async (_client,table) => table==='weight_log' ? [row] : []);
  const query={ delete:jest.fn(()=>query), insert:jest.fn(()=>query), eq:jest.fn(()=>query), select:jest.fn(()=>query),
    single:jest.fn().mockResolvedValueOnce({data:row}).mockResolvedValueOnce({data:{...row,id:43}}) };
  supabase.from.mockReturnValue(query);
  await flush(()=>root.render(<App />)); await click('Progress'); await click('Weight');
  await flush(()=>div.querySelector('[aria-label="Delete weight entry"]').click());
  expect(div.querySelector('[aria-label="Delete weight entry"]')).toBeNull();
  await click('UNDO');
  expect(div.querySelector('[aria-label="Delete weight entry"]')).toBeTruthy();
  expect(query.insert.mock.calls[0][0]).not.toHaveProperty('id');
  expect(query.insert.mock.calls[0][0].user_id).toBe('alice');
});
