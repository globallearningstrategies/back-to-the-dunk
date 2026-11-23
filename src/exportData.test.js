import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { FAST_BREAK_NOTES } from './model';
import { toCSV, formatDateTime, activityExport, gamesExport, weightExport, shootingExport, foodExport, backupJSON, backupExport, deliverFile, DataExport } from './exportData';

// Local-time ISO strings so the expectations hold in any time zone.
const at = (d, h = 9, m = 5) => new Date(2026, 10, d, h, m).toISOString();
const NOW = new Date(2026, 10, 23, 12, 0);

describe('toCSV', () => {
  const cols = [{ key: 'a', label: 'A' }, { key: 'b', label: 'B, "quoted"' }];

  test('quotes commas, quotes and newlines per RFC 4180 and uses CRLF', () => {
    const csv = toCSV([{ a: 'x,y', b: 'say "hi"' }, { a: 'line1\nline2', b: 'plain' }, { a: null, b: undefined }], cols);
    expect(csv).toBe('A,"B, ""quoted"""\r\n"x,y","say ""hi"""\r\n"line1\nline2",plain\r\n,\r\n');
  });

  test('keeps numbers and zero, neutralises formulas', () => {
    expect(toCSV([{ a: 0, b: '=SUM(A1)' }], cols).split('\r\n')[1]).toBe("0,'=SUM(A1)");
  });

  test('converts ISO date-times and Dates to local YYYY-MM-DD HH:MM, leaves plain days alone', () => {
    const csv = toCSV([{ a: at(3, 7, 4), b: '2026-11-03' }, { a: new Date(2026, 0, 9, 18, 30), b: 'not a date' }], cols);
    expect(csv.split('\r\n').slice(1, 3)).toEqual(['2026-11-03 07:04,2026-11-03', '2026-01-09 18:30,not a date']);
    expect(formatDateTime('nope')).toBe('');
  });
});

const cardio = [
  { id: 1, workout_type: 'game', completed_at: at(20), duration_min: 44, rpe: 8, notes: 'Hot from deep', points: 14, rebounds: 6 },
  { id: 2, workout_type: 'game', completed_at: at(22), duration_min: 44, rpe: 9, notes: null, points: 9, rebounds: 4, assists: 3, steals: 2, threes_made: 1 },
  { id: 3, workout_type: 'long_interval', completed_at: at(21), duration_min: 15, rpe: 9, notes: FAST_BREAK_NOTES },
  { id: 4, workout_type: 'long_interval', completed_at: at(19), duration_min: 20, rpe: 9, notes: 'Hill repeats' },
  { id: 5, workout_type: 'tabata', completed_at: at(18), duration_min: 4, rpe: 8 },
  { id: 6, workout_type: 'cross_training', completed_at: at(17), duration_min: 50, rpe: 7, class_name: 'SWEAT440 Strength – Lower', focus: 'legs' },
  { id: 7, workout_type: 'long_interval', completed_at: at(16), duration_min: 12, rpe: 10, notes: 'Dyno day · Cooper 12-min test · 1.45 mi · est VO₂max 21' },
];
const history = [
  { id: 10, session_name: 'Treadmill Walk', logged_at: at(15), total_volume: 0, exercises: [{ duration: 40, speed: 3.6, incline: 4, miles: 2.4, pace: 'brisk', notes: 'Podcast' }] },
  { id: 11, session_name: 'Treadmill Walk', logged_at: at(14), total_volume: 0, exercises: [{ duration: 30, miles: 1.5 }] },
  { id: 12, session_name: 'Lower A', logged_at: at(13), total_volume: 5400, exercises: [{ name: 'Squat', sets: 3, reps: 5, weight: 185, volume: 2775 }, { name: 'RDL', sets: 3, reps: 8, weight: 135, volume: 3240 }] },
];
const courtRatings = { 1: 'strong', 2: 'struggled' };
const legsLog = { 2: 'gassed' };

test('activityExport names every activity, newest first, with ratings only on games', () => {
  const { filename, columns, rows } = activityExport({ cardioSessions: cardio, history, courtRatings, legsLog }, NOW);
  expect(filename).toBe('back-to-the-dunk-activity-2026-11-23.csv');
  expect(rows.map(r => r.activity)).toEqual(['Basketball game', '10 sprints', 'Basketball game', 'Intervals', 'Tabata', 'Sweat440 Strength – Lower', 'Conditioning test', 'Brisk walk', 'Easy walk', 'Lift']);
  expect(columns.map(c => c.label)).toEqual(['Date', 'Activity', 'Minutes', 'Effort (1-10)', 'Points', 'Rebounds', 'Assists', 'Steals', 'Threes made', 'Court rating', '4th-quarter legs', 'Distance (mi)', 'Lift volume (lb)', 'Notes']);
  const [newGame, sprints, oldGame] = rows;
  expect(newGame).toMatchObject({ points: 9, assists: 3, steals: 2, threes: 1, rating: 'struggled', legs: 'gassed' });
  expect(oldGame).toMatchObject({ points: 14, rebounds: 6, assists: null, steals: null, threes: null, rating: 'strong', legs: null, notes: 'Hot from deep' });
  expect(sprints.notes).toBeNull();
  expect(rows.find(r => r.activity === 'Conditioning test')).toMatchObject({ minutes: 12, miles: 1.45 });
  expect(rows.find(r => r.activity === 'Brisk walk')).toMatchObject({ minutes: 40, miles: 2.4, notes: 'Podcast' });
  expect(rows.find(r => r.activity === 'Lift')).toMatchObject({ volume: 5400, notes: 'Squat; RDL' });
  const csv = toCSV(rows, columns).split('\r\n');
  expect(csv[1]).toBe(`2026-11-22 09:05,Basketball game,44,9,9,4,3,2,1,struggled,gassed,,,`);
});

test('gamesExport keeps only games with box score, rating and legs', () => {
  const { filename, columns, rows } = gamesExport({ cardioSessions: cardio, courtRatings, legsLog }, NOW);
  expect(filename).toBe('back-to-the-dunk-games-2026-11-23.csv');
  expect(rows).toHaveLength(2);
  expect(columns.map(c => c.key)).toEqual(['date', 'minutes', 'effort', 'points', 'rebounds', 'assists', 'steals', 'threes', 'rating', 'legs', 'notes']);
  expect(toCSV(rows, columns).split('\r\n')[2]).toBe('2026-11-20 09:05,44,8,14,6,,,,strong,,Hot from deep');
});

test('weightExport sorts newest first', () => {
  const { rows, filename } = weightExport([{ id: 1, weight: 231.4, logged_at: at(1) }, { id: 2, weight: '229.8', logged_at: at(9) }], NOW);
  expect(filename).toBe('back-to-the-dunk-weight-2026-11-23.csv');
  expect(rows).toEqual([{ date: at(9), weight: 229.8 }, { date: at(1), weight: 231.4 }]);
});

test('shootingExport handles threes, free throws, untracked makes and optional spots', () => {
  const plain = shootingExport({ a: { at: at(5), attempts: 50, makes: 18 }, b: { at: at(6), attempts: 20, makes: null }, c: { at: at(7), attempts: 0, makes: 0 } }, NOW);
  expect(plain.columns.map(c => c.key)).toEqual(['date', 'type', 'attempts', 'makes', 'pct']);
  expect(plain.rows).toEqual([{ date: at(6), type: 'Threes', attempts: 20, makes: null, pct: null }, { date: at(5), type: 'Threes', attempts: 50, makes: 18, pct: 36 }]);

  const spots = shootingExport({ a: { at: at(5), attempts: 30, makes: 11, spots: { lc: 3, lw: 2, top: 1, rw: { makes: 4 }, rc: 1 } }, b: { at: at(6), attempts: 10, makes: 7, kind: 'ft' } }, NOW);
  expect(spots.columns.map(c => c.label)).toContain('Left corner makes');
  expect(spots.rows[0]).toMatchObject({ type: 'Free throws', pct: 70, spot_lc: null });
  expect(spots.rows[1]).toMatchObject({ type: 'Threes', pct: 36.7, spot_lc: 3, spot_rw: 4, spot_rc: 1 });
});

test('foodExport skips deleted entries', () => {
  const { rows, filename } = foodExport({
    x: { name: 'Greek yogurt', protein: 20, calories: 150, portions: 1, day: '2026-11-22', createdAt: at(22) },
    y: null,
    z: { name: 'Chicken, rice', protein: 45, calories: 600, portions: 1.5, day: '2026-11-23', createdAt: at(23) },
  }, NOW);
  expect(filename).toBe('back-to-the-dunk-food-2026-11-23.csv');
  expect(rows.map(r => r.name)).toEqual(['Chicken, rice', 'Greek yogurt']);
  expect(rows[0]).toMatchObject({ day: '2026-11-23', portions: 1.5, protein: 45, calories: 600 });
});

test('backupJSON contains every input plus version and timestamp', () => {
  const all = { cardioSessions: cardio, history, weightLog: [{ id: 1, weight: 230, logged_at: at(1) }], shooting: { a: { at: at(5), attempts: 5, makes: 2 } }, courtRatings, legsLog, foodEntries: { y: null }, cloudState: { prefs: { theme: 'dark' } } };
  const backup = backupJSON(all, NOW);
  expect(backup).toEqual({ app: 'back-to-the-dunk', version: 1, exportedAt: NOW.toISOString(), ...all });
  const file = backupExport(all, NOW);
  expect(file.filename).toBe('back-to-the-dunk-backup-2026-11-23.json');
  expect(JSON.parse(file.text)).toEqual(backup);
});

describe('deliverFile', () => {
  const realCreate = URL.createObjectURL, realRevoke = URL.revokeObjectURL;
  afterEach(() => { URL.createObjectURL = realCreate; URL.revokeObjectURL = realRevoke; delete navigator.canShare; delete navigator.share; jest.useRealTimers(); });

  test('falls back to an anchor download when navigator.canShare is absent', async () => {
    jest.useFakeTimers();
    URL.createObjectURL = jest.fn(() => 'blob:fake');
    URL.revokeObjectURL = jest.fn();
    const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () {
      expect(this.download).toBe('games.csv');
      expect(this.getAttribute('href')).toBe('blob:fake');
    });
    await expect(deliverFile('games.csv', 'a,b\r\n', 'text/csv')).resolves.toEqual({ method: 'download' });
    expect(click).toHaveBeenCalledTimes(1);
    expect(URL.createObjectURL.mock.calls[0][0]).toBeInstanceOf(Blob);
    expect(document.querySelector('a[download]')).toBeNull();
    jest.runAllTimers();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:fake');
    click.mockRestore();
  });

  test('uses the share sheet when files can be shared, and treats cancel as not-an-error', async () => {
    navigator.canShare = jest.fn(() => true);
    navigator.share = jest.fn(() => Promise.resolve());
    await expect(deliverFile('b.json', '{}', 'application/json')).resolves.toEqual({ method: 'share' });
    expect(navigator.share.mock.calls[0][0].files[0].name).toBe('b.json');
    navigator.share = jest.fn(() => Promise.reject(Object.assign(new Error('cancelled'), { name: 'AbortError' })));
    await expect(deliverFile('b.json', '{}', 'application/json')).resolves.toEqual({ method: 'share', cancelled: true });
  });
});

describe('DataExport', () => {
  let root, div;
  beforeEach(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; div = document.createElement('div'); document.body.appendChild(div); root = createRoot(div); });
  afterEach(async () => { await act(async () => root.unmount()); div.remove(); });

  test('shows counts, disables empty exports and reports status after an export', async () => {
    const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const realCreate = URL.createObjectURL, realRevoke = URL.revokeObjectURL;
    URL.createObjectURL = jest.fn(() => 'blob:x');
    URL.revokeObjectURL = jest.fn();
    await act(async () => root.render(<DataExport cardioSessions={cardio} history={history} courtRatings={courtRatings} legsLog={legsLog} />));
    const section = div.querySelector('section.engine-card[aria-label="Your data"]');
    expect(section.querySelector('h2').textContent).toBe('Your data');
    const button = name => [...div.querySelectorAll('button')].find(b => b.textContent.startsWith(name));
    expect(button('Games (CSV)').textContent).toBe('Games (CSV) 2');
    expect(button('Games (CSV)').disabled).toBe(false);
    expect(button('Weight (CSV)').disabled).toBe(true);
    expect(button('Food (CSV)').disabled).toBe(true);
    expect(button('Full backup (JSON)').className).toBe('engine-button primary');
    await act(async () => { button('Games (CSV)').click(); });
    expect(click).toHaveBeenCalled();
    expect(div.querySelector('[role="status"]').textContent).toMatch(/^Games ready: back-to-the-dunk-games-\d{4}-\d{2}-\d{2}\.csv$/);
    URL.createObjectURL = jest.fn(() => { throw new Error('No storage'); });
    await act(async () => { button('Activity (CSV)').click(); });
    expect(div.querySelector('[role="alert"]').textContent).toBe("Couldn't export activity. No storage");
    URL.createObjectURL = realCreate; URL.revokeObjectURL = realRevoke;
    click.mockRestore();
  });
});
