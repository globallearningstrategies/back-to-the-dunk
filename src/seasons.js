import React, { useState } from 'react';

/* Seasons — named date ranges for your games. Each season runs from its start
   date until the next season starts. With no seasons saved, everything is one
   "All games" range, which is how the app behaved before. */
const dayStart = key => new Date(`${key}T00:00:00`);
const todayKeyLocal = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const ALL_TIME = { id: 'all', name: 'All games', start: null, end: null };

export function seasonRanges(seasons = []) {
  const sorted = [...seasons].filter(s => s && s.start && Number.isFinite(dayStart(s.start).getTime())).sort((a, b) => a.start.localeCompare(b.start));
  return sorted.map((s, i) => ({ ...s, end: sorted[i + 1] ? sorted[i + 1].start : null }));
}
export function currentSeason(seasons, now = new Date()) {
  const ranges = seasonRanges(seasons).filter(r => dayStart(r.start) <= now);
  return ranges[ranges.length - 1] || ALL_TIME;
}
export function inSeason(date, range) {
  if (!range || range.id === 'all') return true;
  const t = new Date(date).getTime();
  return t >= dayStart(range.start).getTime() && (!range.end || t < dayStart(range.end).getTime());
}
export const filterSeason = (games, range) => games.filter(g => inSeason(g.completed_at, range));
export function defaultSeasonName(d = new Date()) {
  const m = d.getMonth(), y = d.getFullYear();
  if (m >= 8 && m <= 10) return `Fall ${y}`;
  if (m === 11 || m <= 1) return `Winter ${m === 11 ? y : y - 1}–${String((m === 11 ? y + 1 : y) % 100).padStart(2, '0')}`;
  if (m <= 4) return `Spring ${y}`;
  return `Summer ${y}`;
}

export function SeasonPicker({ seasons, value, onChange }) {
  const ranges = seasonRanges(seasons);
  if (!ranges.length) return null;
  return <div className="engine-chips" role="group" aria-label="Season">
    {[...ranges].reverse().map(r => <button key={r.id} className="engine-chip" aria-pressed={value === r.id} onClick={() => onChange(r.id)}>{r.name}</button>)}
    <button className="engine-chip" aria-pressed={value === 'all'} onClick={() => onChange('all')}>All games</button>
  </div>;
}

export function SeasonSettings({ seasons = [], onChange }) {
  const [name, setName] = useState(defaultSeasonName());
  const [start, setStart] = useState(todayKeyLocal());
  const [error, setError] = useState('');
  const ranges = seasonRanges(seasons);
  const current = currentSeason(seasons);
  const add = e => {
    e.preventDefault();
    const label = name.trim();
    if (!label) { setError('Give the season a name.'); return; }
    if (!Number.isFinite(dayStart(start).getTime())) { setError('Choose a start date.'); return; }
    if (seasons.some(s => s.start === start)) { setError('A season already starts on that date.'); return; }
    onChange([...seasons, { id: `season-${Date.now().toString(36)}`, name: label, start }]);
    setError('');
  };
  return <section className="engine-card" aria-label="Seasons">
    <h2>Seasons</h2>
    <p className="engine-muted">Season averages and game insights use the current season. Each season runs until the next one starts.</p>
    {ranges.length > 0 && <div className="engine-feed" style={{ margin: '10px 0' }}>{[...ranges].reverse().map(r => <div className="engine-entry" key={r.id}>
      <div className="engine-entry-body"><strong>{r.name}{r.id === current.id ? ' · current' : ''}</strong><span>{dayStart(r.start).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} – {r.end ? dayStart(r.end).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'now'}</span></div>
      <button className="engine-icon-button" aria-label={`Remove season ${r.name}`} onClick={() => onChange(seasons.filter(s => s.id !== r.id))}>✕</button>
    </div>)}</div>}
    <form onSubmit={add}>
      <div className="engine-grid">
        <label className="engine-field">Season name<input aria-label="Season name" value={name} onChange={e => { setName(e.target.value); setError(''); }}/></label>
        <label className="engine-field">Starts<input aria-label="Season start" type="date" value={start} onChange={e => { setStart(e.target.value); setError(''); }}/></label>
      </div>
      {error && <p role="alert">{error}</p>}
      <button className="engine-button primary" type="submit">{ranges.length ? 'Start a new season' : 'Start your first season'}</button>
    </form>
    <p className="engine-muted">Removing a season doesn’t delete any games.</p>
  </section>;
}
