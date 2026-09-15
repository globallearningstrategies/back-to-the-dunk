import React, { useRef, useState } from 'react';
import { RECOVERY } from './model';
import { toLocalInput } from './logging';

export const FAST_BREAK_NOTES = 'Fast break · 10 sprints · walk-back recovery';

export function FastBreakLog({ onSave, onClose, busy = false }) {
  const [minutes, setMinutes] = useState('10');
  const [effort, setEffort] = useState(String(RECOVERY.TYPES.long_interval.defaultRPE));
  const [when, setWhen] = useState(() => toLocalInput(new Date()));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const pending = busy || saving;
  const close = () => { if (!savingRef.current && !busy) onClose(); };
  const save = async event => {
    event.preventDefault();
    if (savingRef.current || busy) return;
    const duration = Number(minutes), rpe = Number(effort), date = new Date(when);
    if (!Number.isFinite(duration) || duration <= 0 || duration > 1440 || !Number.isInteger(rpe) || rpe < 1 || rpe > 10 || !Number.isFinite(date.getTime()) || date > new Date()) {
      setError('Check the duration, effort (1–10), and date.');
      return;
    }
    savingRef.current = true; setSaving(true); setError('');
    let saved = false;
    try {
      saved = await onSave({ type: 'long_interval', completed_at: date.toISOString(), duration_min: duration, rpe, notes: FAST_BREAK_NOTES });
      if (!saved) setError('Your session wasn’t saved. Your details are still here—try again.');
    } catch {
      setError('Your session wasn’t saved. Your details are still here—try again.');
    } finally { savingRef.current = false; setSaving(false); }
    if (saved) onClose();
  };

  return <div className="backdrop" onClick={close} onKeyDown={e => { if (e.key === 'Escape') close(); }}>
    <form className="engine-card" role="dialog" aria-modal="true" aria-labelledby="fast-break-title" onClick={e => e.stopPropagation()} onSubmit={save} style={{width:'100%',maxWidth:440,maxHeight:'90dvh',overflowY:'auto'}}>
      <div className="engine-row"><span className="engine-label">Fast breaks · Quick log</span><button type="button" className="engine-link" onClick={close} disabled={pending}>Close</button></div>
      <h2 id="fast-break-title">10 sprints</h2>
      <p>Sprint, then walk back to your starting spot. Repeat 10 times.</p>
      <label className="engine-field">How hard did it feel? (1–10)<input aria-label="Sprint effort" type="number" inputMode="numeric" min="1" max="10" step="1" value={effort} onChange={e => setEffort(e.target.value)} disabled={pending}/></label>
      <p className="engine-muted">Logging {minutes || '—'} minutes including walk-back recovery. The 10-minute estimate is used for your Engine score; adjust it to match your session.</p>
      <details className="engine-details"><summary>Adjust time or date</summary>
        <div className="engine-actions" aria-label="Quick durations">{[10,12,15].map(m => <button key={m} type="button" className="engine-button" aria-pressed={Number(minutes)===m} onClick={() => setMinutes(String(m))} disabled={pending}>{m} min</button>)}</div>
        <label className="engine-field">Total minutes<input aria-label="Sprint duration" type="number" inputMode="decimal" min="0.1" max="1440" step="any" value={minutes} onChange={e => setMinutes(e.target.value)} disabled={pending}/></label>
        <label className="engine-field">When<input aria-label="Sprint date" type="datetime-local" max={toLocalInput(new Date())} value={when} onChange={e => setWhen(e.target.value)} disabled={pending}/></label>
      </details>
      {error && <p role="alert">{error}</p>}
      <button className="engine-button primary" type="submit" autoFocus disabled={pending} style={{width:'100%',marginTop:12}}>{pending ? 'Saving…' : 'Log 10 sprints'}</button>
    </form>
  </div>;
}
