import { useRef, useState } from 'react';
import { accountKey, readJSON, writeJSON } from './storage';

export function useWorkoutDraft(userId, initialDate) {
  const key = accountKey(userId, 'workout-draft');
  const [draft, setDraft] = useState(() => {
    const saved = readJSON(key, null);
    return saved && saved.version === 1 && typeof saved.checked === 'object' && typeof saved.vals === 'object'
      ? saved : { version: 1, activeSession: 0, checked: {}, vals: {}, liftDate: initialDate };
  });
  const current = useRef(draft);
  const [error, setError] = useState('');
  const [resumed, setResumed] = useState(() => Object.values(draft.checked).some(Boolean));
  const setField = field => next => {
    const value = typeof next === 'function' ? next(current.current[field]) : next;
    current.current = { ...current.current, [field]: value };
    try { writeJSON(key, current.current); setError(''); }
    catch { setError('Your browser could not save this workout draft. Keep the page open.'); }
    setDraft(current.current);
  };
  return { ...draft, setActiveSession: setField('activeSession'), setChecked: setField('checked'),
    setVals: setField('vals'), setLiftDate: setField('liftDate'), error, resumed,
    dismissResume: () => setResumed(false) };
}
