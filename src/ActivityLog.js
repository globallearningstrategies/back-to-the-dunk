import React, { useMemo, useState } from 'react';
import { RECOVERY, s440FocusFor, daysAgo, fmtNum } from './model';
import { FAST_BREAK_NOTES } from './FastBreakLog';
import { shootingSessions, formatPct, shotPct } from './shooting';
import { Icon } from './ui';

const FILTERS = [['all', 'All'], ['game', 'Games'], ['shooting', 'Shooting'], ['conditioning', 'Conditioning'], ['strength', 'Strength'], ['walk', 'Walks']];
const PAGE = 40;

export function buildFeed(cardioSessions, history, shooting) {
  return [
    ...cardioSessions.map(s => {
      const def = RECOVERY.TYPES[s.workout_type] || {};
      const focus = s.workout_type === 'cross_training' ? s440FocusFor(s.focus) : null;
      const className = s.workout_type === 'cross_training' && s.class_name ? s.class_name.replace('SWEAT440 ', '') : null;
      const sprints = s.workout_type === 'long_interval' && s.notes === FAST_BREAK_NOTES;
      return { key: `cardio${s.id}`, kind: 'cardio', group: s.workout_type === 'game' ? 'game' : 'conditioning', id: s.id, date: new Date(s.completed_at), emoji: def.emoji || '•',
        title: sprints ? 'Fast break · 10 sprints' : def.label || s.workout_type,
        detail: [className ? `${focus ? focus.emoji + ' ' : ''}${className}` : focus ? `${focus.emoji} ${focus.label} day` : null, s.points != null ? `${s.points} pts` : null, s.rebounds != null ? `${s.rebounds} reb` : null, s.duration_min != null ? `${s.duration_min} min` : null, s.rpe != null ? `Effort ${s.rpe}/10` : null, sprints ? null : s.notes].filter(Boolean).join(' · '), raw: s };
    }),
    ...history.map(w => {
      const walk = w.session_name === 'Treadmill Walk';
      const exercises = w.exercises || [];
      return { key: `workout${w.id}`, kind: walk ? 'walk' : 'lift', group: walk ? 'walk' : 'strength', id: w.id, date: new Date(w.logged_at), emoji: RECOVERY.TYPES[walk ? 'walk' : 'lift'].emoji,
        title: walk ? 'Walk' : 'Lift', detail: walk ? exercises[0]?.name || '' : [w.total_volume > 0 ? `${fmtNum(w.total_volume)} lb` : null, `${exercises.length} ${exercises.length === 1 ? 'exercise' : 'exercises'}`].filter(Boolean).join(' · '),
        exercises: walk ? null : exercises, raw: w };
    }),
    ...shootingSessions(shooting).map(s => ({ key: `shot${s.id}`, kind: 'shooting', group: 'shooting', id: s.id, date: s.at, emoji: '🎯',
      title: `${s.attempts} threes`, detail: s.makes == null ? 'Reps logged · no count' : `${s.makes} made · ${formatPct(shotPct(s.makes, s.attempts))}`, raw: s })),
  ].sort((a, b) => b.date - a.date);
}

export function ActivityLog({ cardioSessions, history, shooting, busy, onAdd, onEdit, onDelete }) {
  const [filter, setFilter] = useState('all');
  const [limit, setLimit] = useState(PAGE);
  const [open, setOpen] = useState({});
  const feed = useMemo(() => buildFeed(cardioSessions, history, shooting), [cardioSessions, history, shooting]);
  const shown = filter === 'all' ? feed : feed.filter(f => f.group === filter);
  const recent = feed.filter(f => Date.now() - f.date.getTime() < 14 * 86400000).length;
  const months = [];
  shown.slice(0, limit).forEach(f => {
    const label = f.date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    if (!months.length || months[months.length - 1].label !== label) months.push({ label, items: [] });
    months[months.length - 1].items.push(f);
  });
  return <>
    <div className="engine-row" style={{ marginBottom: 16 }}>
      <div><span className="engine-label">Everything you’ve recorded</span><h1 style={{ fontSize: 34, letterSpacing: '-.04em', margin: '4px 0 0', lineHeight: 1 }}>Activity</h1></div>
      <button className="engine-button primary" onClick={onAdd} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icon name="plus" size={18} strokeWidth={2.4}/>Add</button>
    </div>
    <div className="engine-grid" style={{ marginBottom: 14 }}>
      <div className="engine-mini"><span className="engine-label">All time</span><strong>{feed.length}</strong><div className="engine-muted">entries</div></div>
      <div className="engine-mini"><span className="engine-label">Last 14 days</span><strong>{recent}</strong><div className="engine-muted">entries</div></div>
    </div>
    {feed.length > 0 && <div className="engine-chips" role="group" aria-label="Filter activity">{FILTERS.filter(([key]) => key === 'all' || feed.some(f => f.group === key)).map(([key, label]) => <button key={key} className="engine-chip" aria-pressed={filter === key} onClick={() => { setFilter(key); setLimit(PAGE); }}>{label}</button>)}</div>}
    {feed.length === 0 && <section className="engine-card engine-empty"><div style={{ fontSize: 34 }}>🏀</div><h2>Nothing logged yet</h2><p className="engine-muted">Your games, shooting, conditioning and lifts will show up here.</p><button className="engine-button primary" onClick={onAdd}>Log your first activity</button></section>}
    {months.map(month => <React.Fragment key={month.label}>
      <div className="engine-label engine-month">{month.label}</div>
      <div className="engine-feed">{month.items.map(f => {
        const expandable = f.exercises && f.exercises.length > 0;
        const when = `${f.date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} · ${daysAgo(f.date)}`;
        return <div key={f.key}>
          <div className="engine-entry">
            <div className="engine-entry-icon" aria-hidden="true">{f.emoji}</div>
            <div className="engine-entry-body"><strong>{f.title}</strong>{f.detail && <span>{f.detail}</span>}<span>{when}</span></div>
            <div className="engine-entry-actions">
              {expandable && <button className="engine-icon-button" aria-expanded={!!open[f.key]} aria-label={`${open[f.key] ? 'Hide' : 'Show'} exercises`} onClick={() => setOpen(p => ({ ...p, [f.key]: !p[f.key] }))}><Icon name="chevron" size={20} style={{ transform: open[f.key] ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}/></button>}
              <button className="engine-icon-button" aria-label={`Edit ${f.title}, ${when}`} onClick={() => onEdit(f)}><Icon name="edit" size={19}/></button>
              <button className="engine-icon-button" disabled={busy} aria-label={`Delete ${f.title}, ${when}`} onClick={() => onDelete(f)}><Icon name="trash" size={19}/></button>
            </div>
          </div>
          {expandable && open[f.key] && <div className="engine-entry-detail">{f.exercises.map((ex, i) => <div key={i}><span>{ex.name}</span><span>{ex.sets}×{ex.reps}{ex.weight > 0 ? ` @ ${ex.weight}` : ''}</span></div>)}</div>}
        </div>;
      })}</div>
    </React.Fragment>)}
    {feed.length > 0 && shown.length === 0 && <p className="engine-muted" style={{ textAlign: 'center' }}>Nothing in this category yet.</p>}
    {shown.length > limit && <button className="engine-button" style={{ width: '100%', marginTop: 14 }} onClick={() => setLimit(limit + PAGE)}>Show {Math.min(PAGE, shown.length - limit)} more</button>}
  </>;
}
