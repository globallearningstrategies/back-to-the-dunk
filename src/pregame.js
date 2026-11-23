import React from 'react';

/* Pre-game check — two taps before a game: how you slept and how your legs
   feel. Stored per calendar day in the synced `pregame` map. */
export const SLEEP = [{ key: 'poor', label: 'Poor' }, { key: 'ok', label: 'OK' }, { key: 'good', label: 'Good' }];
export const LEGS = [{ key: 'heavy', label: 'Heavy' }, { key: 'normal', label: 'Normal' }, { key: 'fresh', label: 'Fresh' }];
export const dayKeyOf = d => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
export const pregameLabel = v => [v?.sleep && `Sleep ${SLEEP.find(o => o.key === v.sleep)?.label.toLowerCase()}`, v?.legs && `legs ${LEGS.find(o => o.key === v.legs)?.label.toLowerCase()}`].filter(Boolean).join(' · ');

/* `variant="court"` uses the warm-up's high-contrast styles; default uses the app's. */
export function PregameCheck({ value = {}, onChange, variant }) {
  const court = variant === 'court';
  const row = (title, options, key) => <div className={court ? 'pregame-row court' : 'pregame-row'}>
    <span className={court ? 'pregame-q' : 'engine-label'}>{title}</span>
    <div className={court ? 'pregame-options' : 'engine-actions'} role="group" aria-label={title}>
      {options.map(o => <button key={o.key} type="button" className={court ? 'warmup-choice' : 'engine-button'} aria-pressed={value[key] === o.key}
        onClick={() => onChange({ ...value, [key]: value[key] === o.key ? null : o.key })}>{o.label}</button>)}
    </div>
  </div>;
  return <div className={court ? 'pregame court' : 'pregame'}>
    {row('Sleep last night', SLEEP, 'sleep')}
    {row('Legs right now', LEGS, 'legs')}
  </div>;
}
