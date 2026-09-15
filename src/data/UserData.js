import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from './client';
import { fetchAll } from './records';
import { accountKey, readJSON, writeJSON, unpack, changesFor, legacyRecords } from './storage';

const Context = createContext(null);
export const useUserData = () => useContext(Context);

export function UserDataProvider({ userId, children }) {
  const cacheKey = accountKey(userId, 'cloud');
  const pendingKey = accountKey(userId, 'pending');
  const pending = useRef(readJSON(pendingKey, {}));
  const records = useRef({ ...readJSON(cacheKey, {}), ...pending.current });
  const [, render] = useState(0);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [syncing, setSyncing] = useState(false);
  const active = useRef(true);
  const running = useRef(null);
  const readyRef = useRef(false);
  const [legacyAvailable, setLegacyAvailable] = useState(() =>
    !readJSON('bttd_legacy_claimed_by', null) && Object.keys(legacyRecords({})).length > 0);

  const persist = () => {
    writeJSON(pendingKey, pending.current);
    writeJSON(cacheKey, records.current);
  };

  const sync = () => {
    if (running.current) return running.current;
    if (!active.current) return Promise.resolve();
    setSyncing(true);
    running.current = (async () => {
      let succeeded = false;
      try {
        // Retry pending edits before fetching, so an old response cannot erase them.
        while (Object.keys(pending.current).length && active.current) {
          const batch = Object.fromEntries(Object.entries(pending.current).slice(0, 100));
          const { error: saveError } = await supabase.from('user_state').upsert(
            Object.entries(batch).map(([key, value]) => ({ user_id: userId, key, value })),
            { onConflict: 'user_id,key' });
          if (saveError) throw saveError;
          for (const [key, value] of Object.entries(batch)) {
            if (JSON.stringify(pending.current[key]) === JSON.stringify(value)) delete pending.current[key];
          }
          persist();
        }
        if (!active.current) return;
        const rows = await fetchAll(supabase, 'user_state', userId, 'key');
        if (!active.current) return;
        records.current = { ...Object.fromEntries(rows.map(r => [r.key, r.value])), ...pending.current };
        persist();
        readyRef.current = true;
        setReady(true); setError(''); render(n => n + 1);
        succeeded = true;
      } catch (e) {
        if (active.current) setError(e.message || 'Sync failed. Your pending changes are kept on this device.');
      } finally {
        running.current = null;
        if (active.current) setSyncing(false);
        if (succeeded && active.current && Object.keys(pending.current).length) {
          Promise.resolve().then(() => syncRef.current());
        }
      }
    })();
    return running.current;
  };
  const syncRef = useRef(sync);
  syncRef.current = sync;
  useEffect(() => {
    active.current = true;
    syncRef.current();
    const refresh = () => syncRef.current();
    window.addEventListener('online', refresh);
    window.addEventListener('focus', refresh);
    const timer = setInterval(refresh, 30000);
    return () => {
      active.current = false;
      clearInterval(timer);
      window.removeEventListener('online', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  const update = (changes) => {
    if (!active.current || !readyRef.current) return;
    records.current = { ...records.current, ...changes };
    pending.current = { ...pending.current, ...changes };
    try { persist(); } catch { setError('Device storage is full. Keep this page open until sync finishes.'); }
    render(n => n + 1);
    // Coalesce edits in the same interaction; ongoing sync consumes later edits too.
    Promise.resolve().then(() => syncRef.current());
  };
  const value = {
    userId, ready, error, syncing, pendingCount: Object.keys(pending.current).length, retry: sync, legacyAvailable,
    get: (field, fallback) => unpack(records.current, field, fallback),
    set: (field, next, fallback) => {
      const old = unpack(records.current, field, fallback);
      const resolved = typeof next === 'function' ? next(old) : next;
      update(changesFor(records.current, field, resolved, fallback));
    },
    importLegacy: () => {
      if (readJSON('bttd_legacy_claimed_by', null)) { setLegacyAvailable(false); return; }
      update(legacyRecords(records.current));
      try { writeJSON('bttd_legacy_claimed_by', userId); setLegacyAvailable(false); }
      catch { setError('Could not record the import on this device.'); }
    },
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
