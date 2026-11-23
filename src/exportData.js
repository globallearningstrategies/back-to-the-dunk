import React, { useMemo, useState } from 'react';
import { FAST_BREAK_NOTES, cardioRowLabel } from './model';

/* Data export: pure builders that turn the app's data into CSV/JSON files,
   a delivery helper that hands the file to the iPhone share sheet (or a plain
   download elsewhere), and the "Your data" Settings card. */

export const BACKUP_VERSION = 1;
const APP = 'back-to-the-dunk';
const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
const pad = n => String(n).padStart(2, '0');

export function dayStamp(d = new Date()) {
  const x = new Date(d);
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
}

/** Local `YYYY-MM-DD HH:MM` for a Date or ISO date-time string; '' when invalid. */
export function formatDateTime(value) {
  const d = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(d.getTime())) return '';
  return `${dayStamp(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const exportFilename = (kind, ext, now = new Date()) => `${APP}-${kind}-${dayStamp(now)}.${ext}`;

function cell(value) {
  if (value == null) return '';
  if (value instanceof Date) return formatDateTime(value);
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  let s = String(value);
  if (ISO_DATETIME.test(s)) {
    const formatted = formatDateTime(s);
    if (formatted) s = formatted;
  }
  // Keep spreadsheets from evaluating text as a formula.
  if (/^[=+@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** RFC 4180 CSV. `columns` is [{ key, label }]; ISO date-times become local `YYYY-MM-DD HH:MM`. */
export function toCSV(rows, columns) {
  const lines = [columns.map(c => cell(c.label)).join(',')];
  for (const row of rows || []) lines.push(columns.map(c => cell(row[c.key])).join(','));
  return lines.join('\r\n') + '\r\n';
}

const num = v => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));
const time = v => { const t = new Date(v).getTime(); return Number.isFinite(t) ? t : 0; };
const newestFirst = (a, b) => time(b.date) - time(a.date);
const round1 = v => (v == null ? null : Math.round(v * 10) / 10);

const isSprints = r => r.workout_type === 'long_interval' && r.notes === FAST_BREAK_NOTES;
const isDyno = r => typeof r.notes === 'string' && r.notes.startsWith('Dyno day');

export function cardioActivityName(r) {
  switch (r.workout_type) {
    case 'cross_training': {
      const cls = (r.class_name || '').replace(/^SWEAT440\s*/i, '').trim();
      return cls ? `Sweat440 ${cls}` : 'Sweat440';
    }
    default: return cardioRowLabel(r) || 'Activity';
  }
}

const dynoMiles = notes => { const m = / ([\d.]+) mi\b/.exec(notes || ''); return m ? Number(m[1]) : null; };

const ACTIVITY_COLUMNS = [
  { key: 'date', label: 'Date' }, { key: 'activity', label: 'Activity' }, { key: 'minutes', label: 'Minutes' },
  { key: 'effort', label: 'Effort (1-10)' }, { key: 'points', label: 'Points' }, { key: 'rebounds', label: 'Rebounds' },
  { key: 'assists', label: 'Assists' }, { key: 'steals', label: 'Steals' }, { key: 'threes', label: 'Threes made' },
  { key: 'rating', label: 'Court rating' }, { key: 'legs', label: '4th-quarter legs' }, { key: 'miles', label: 'Distance (mi)' },
  { key: 'volume', label: 'Lift volume (lb)' }, { key: 'notes', label: 'Notes' },
];

function cardioRow(r, courtRatings, legsLog) {
  const game = r.workout_type === 'game';
  return {
    date: r.completed_at, activity: cardioActivityName(r), minutes: num(r.duration_min), effort: num(r.rpe),
    points: num(r.points), rebounds: num(r.rebounds), assists: num(r.assists), steals: num(r.steals), threes: num(r.threes_made),
    rating: game ? (courtRatings || {})[r.id] || null : null, legs: game ? (legsLog || {})[r.id] || null : null,
    miles: isDyno(r) ? dynoMiles(r.notes) : null, volume: null, notes: isSprints(r) ? null : r.notes || null,
  };
}

export function activityExport({ cardioSessions = [], history = [], courtRatings = {}, legsLog = {} } = {}, now = new Date()) {
  const rows = [
    ...(cardioSessions || []).filter(Boolean).map(r => cardioRow(r, courtRatings, legsLog)),
    ...(history || []).filter(Boolean).map(w => {
      if (w.session_name === 'Treadmill Walk') {
        const ex = (w.exercises && w.exercises[0]) || {};
        return { date: w.logged_at, activity: ex.pace === 'brisk' ? 'Brisk walk' : 'Easy walk', minutes: num(ex.duration),
          miles: num(ex.miles), notes: ex.notes || null };
      }
      return { date: w.logged_at, activity: 'Lift', volume: num(w.total_volume),
        notes: (w.exercises || []).map(e => e && e.name).filter(Boolean).join('; ') || null };
    }),
  ].sort(newestFirst);
  return { filename: exportFilename('activity', 'csv', now), columns: ACTIVITY_COLUMNS, rows };
}

const GAME_COLUMNS = ACTIVITY_COLUMNS.filter(c => !['activity', 'miles', 'volume'].includes(c.key));

export function gamesExport({ cardioSessions = [], courtRatings = {}, legsLog = {} } = {}, now = new Date()) {
  const rows = (cardioSessions || []).filter(r => r && r.workout_type === 'game')
    .map(r => cardioRow(r, courtRatings, legsLog)).sort(newestFirst);
  return { filename: exportFilename('games', 'csv', now), columns: GAME_COLUMNS, rows };
}

export function weightExport(weightLog = [], now = new Date()) {
  const rows = (weightLog || []).filter(w => w && num(w.weight) != null)
    .map(w => ({ date: w.logged_at, weight: num(w.weight) })).sort(newestFirst);
  return { filename: exportFilename('weight', 'csv', now), columns: [{ key: 'date', label: 'Date' }, { key: 'weight', label: 'Weight (lb)' }], rows };
}

export const SPOTS = [['lc', 'Left corner'], ['lw', 'Left wing'], ['top', 'Top'], ['rw', 'Right wing'], ['rc', 'Right corner']];
const spotMakes = v => (v != null && typeof v === 'object' ? num(v.makes) : num(v));

export function shootingExport(shooting = {}, now = new Date()) {
  const sessions = Object.values(shooting || {}).filter(v => v && Number(v.attempts) > 0 && time(v.at));
  const hasSpots = sessions.some(s => s.spots && typeof s.spots === 'object');
  const rows = sessions.map(s => {
    const attempts = Number(s.attempts), makes = num(s.makes);
    const row = { date: s.at, type: s.kind === 'ft' ? 'Free throws' : 'Threes', attempts, makes,
      pct: makes == null ? null : round1(makes / attempts * 100) };
    if (hasSpots) for (const [key] of SPOTS) row[`spot_${key}`] = s.spots ? spotMakes(s.spots[key]) : null;
    return row;
  }).sort(newestFirst);
  const columns = [{ key: 'date', label: 'Date' }, { key: 'type', label: 'Type' }, { key: 'attempts', label: 'Attempts' },
    { key: 'makes', label: 'Makes' }, { key: 'pct', label: 'Make %' },
    ...(hasSpots ? SPOTS.map(([key, label]) => ({ key: `spot_${key}`, label: `${label} makes` })) : [])];
  return { filename: exportFilename('shooting', 'csv', now), columns, rows };
}

export function foodExport(foodEntries = {}, now = new Date()) {
  const rows = Object.values(foodEntries || {}).filter(e => e && e.name)
    .map(e => ({ day: e.day || null, name: e.name, portions: num(e.portions), protein: num(e.protein), calories: num(e.calories), createdAt: e.createdAt || null }))
    .sort((a, b) => String(b.day || '').localeCompare(String(a.day || '')) || time(b.createdAt) - time(a.createdAt));
  const columns = [{ key: 'day', label: 'Day' }, { key: 'name', label: 'Food' }, { key: 'portions', label: 'Servings' },
    { key: 'protein', label: 'Protein (g)' }, { key: 'calories', label: 'Calories' }, { key: 'createdAt', label: 'Logged at' }];
  return { filename: exportFilename('food', 'csv', now), columns, rows };
}

/** A complete backup: every input, untouched, plus a version and timestamp. */
export function backupJSON({ cardioSessions = [], history = [], weightLog = [], shooting = {}, courtRatings = {}, legsLog = {}, foodEntries = {}, cloudState = null } = {}, now = new Date()) {
  return { app: APP, version: BACKUP_VERSION, exportedAt: new Date(now).toISOString(),
    cardioSessions, history, weightLog, shooting, courtRatings, legsLog, foodEntries, cloudState };
}

export const backupExport = (data, now = new Date()) =>
  ({ filename: exportFilename('backup', 'json', now), text: JSON.stringify(backupJSON(data, now), null, 2) });

function downloadFile(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  try { a.click(); } finally {
    a.remove();
    // Safari needs the URL alive briefly after the click.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return { method: 'download' };
}

/** Share the file (iPhone share sheet) when possible, else download it. Resolves { method, cancelled? }. */
export async function deliverFile(filename, text, mime = 'text/plain') {
  const blob = new Blob([text], { type: mime });
  const nav = typeof navigator !== 'undefined' ? navigator : null;
  let file = null;
  try { file = typeof File === 'function' ? new File([blob], filename, { type: mime }) : null; } catch { file = null; }
  if (file && nav && typeof nav.share === 'function' && typeof nav.canShare === 'function' && nav.canShare({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: filename });
      return { method: 'share' };
    } catch (err) {
      if (err && err.name === 'AbortError') return { method: 'share', cancelled: true };
      // Any other share failure: fall back to a plain download.
    }
  }
  return downloadFile(filename, blob);
}

const KINDS = [
  { key: 'activity', label: 'Activity (CSV)', one: 'session', many: 'sessions' },
  { key: 'games', label: 'Games (CSV)', one: 'game', many: 'games' },
  { key: 'weight', label: 'Weight (CSV)', one: 'weigh-in', many: 'weigh-ins' },
  { key: 'shooting', label: 'Shooting (CSV)', one: 'session', many: 'sessions' },
  { key: 'food', label: 'Food (CSV)', one: 'entry', many: 'entries' },
];

export function DataExport({ cardioSessions = [], history = [], weightLog = [], shooting = {}, courtRatings = {}, legsLog = {}, foodEntries = {}, cloudState = null }) {
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const exports = useMemo(() => ({
    activity: activityExport({ cardioSessions, history, courtRatings, legsLog }),
    games: gamesExport({ cardioSessions, courtRatings, legsLog }),
    weight: weightExport(weightLog),
    shooting: shootingExport(shooting),
    food: foodExport(foodEntries),
  }), [cardioSessions, history, courtRatings, legsLog, weightLog, shooting, foodEntries]);
  const hasAnything = KINDS.some(k => exports[k.key].rows.length > 0) || (cloudState && Object.keys(cloudState).length > 0);

  const send = async (label, filename, text, mime) => {
    setBusy(true);
    setStatus(null);
    try {
      const result = await deliverFile(filename, text, mime);
      setStatus({ ok: true, text: result.cancelled ? 'Export cancelled.' : `${label} ready: ${filename}` });
    } catch (err) {
      setStatus({ ok: false, text: `Couldn't export ${label.toLowerCase()}. ${err && err.message ? err.message : 'Please try again.'}` });
    } finally {
      setBusy(false);
    }
  };

  const exportCSV = kind => {
    const { filename, columns, rows } = exports[kind.key];
    // The BOM lets Excel read the en dashes and emoji as UTF-8.
    send(kind.label.replace(' (CSV)', ''), filename, '﻿' + toCSV(rows, columns), 'text/csv;charset=utf-8');
  };
  const exportBackup = () => {
    const { filename, text } = backupExport({ cardioSessions, history, weightLog, shooting, courtRatings, legsLog, foodEntries, cloudState });
    send('Backup', filename, text, 'application/json');
  };

  return (
    <section className="engine-card" aria-label="Your data">
      <h2>Your data</h2>
      <p className="engine-muted">Save a copy of everything you've logged, as spreadsheets or one full backup file.</p>
      <div className="engine-actions">
        {KINDS.map(kind => {
          const count = exports[kind.key].rows.length;
          return (
            <button key={kind.key} type="button" className="engine-button" disabled={busy || count === 0} onClick={() => exportCSV(kind)}
              aria-label={`${kind.label}, ${count} ${count === 1 ? kind.one : kind.many}`}>
              {kind.label} <span className="engine-muted">{count}</span>
            </button>
          );
        })}
      </div>
      <div className="engine-actions">
        <button type="button" className="engine-button primary" disabled={busy || !hasAnything} onClick={exportBackup}>Full backup (JSON)</button>
      </div>
      {status && status.ok && <p className="engine-muted" role="status">{status.text}</p>}
      {status && !status.ok && <p className="engine-muted" role="alert">{status.text}</p>}
    </section>
  );
}
