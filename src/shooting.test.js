import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { shootingSummary, validateShots, validateSpots, shootingSessions, shotLabel, ThreePointLog, FreeThrowLog, ShootingCard } from './shooting';

const now = new Date('2026-11-12T18:00:00');
const at = days => new Date(now.getTime() - days * 86400000).toISOString();

test('summary totals shots, ignores uncounted sessions in the percentage and skips deleted entries', () => {
  const s = shootingSummary({ a: { at: at(1), attempts: 100, makes: 40 }, b: { at: at(3), attempts: 100, makes: null }, c: { at: at(10), attempts: 50, makes: 10 }, d: null }, now);
  expect(s.count).toBe(3);
  expect(s.attempts).toBe(250);
  expect(s.makes).toBe(50);
  expect(s.pct).toBeCloseTo(50 / 150 * 100);
  expect(s.weekShots).toBe(200);
  expect(s.best.id).toBe('a');
  expect(s.trend).toBeNull();
  expect(shootingSessions({ a: { at: at(1), attempts: 100 }, b: { at: at(0), attempts: 100 } }).map(x => x.id)).toEqual(['b', 'a']);
});

test('trend compares the latest five counted sessions with the five before', () => {
  const log = Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`s${i}`, { at: at(i), attempts: 100, makes: i < 5 ? 40 : 30 }]));
  expect(shootingSummary(log, now).trend).toBeCloseTo(10);
});

test('validation accepts blank makes and rejects impossible counts or future dates', () => {
  expect(validateShots({ attempts: '100', makes: '', when: '2026-11-12T10:00' }, now).value).toEqual({ at: new Date('2026-11-12T10:00').toISOString(), attempts: 100, makes: null });
  expect(validateShots({ attempts: '100', makes: '37', when: '2026-11-12T10:00' }, now).value.makes).toBe(37);
  expect(validateShots({ attempts: '100', makes: '101', when: '2026-11-12T10:00' }, now).error).toContain('0 to 100');
  expect(validateShots({ attempts: '0', makes: '', when: '2026-11-12T10:00' }, now).error).toBeTruthy();
  expect(validateShots({ attempts: '100', makes: '10', when: '2026-11-13T10:00' }, now).error).toContain('already happened');
});

const spotsOf = (lc, lw, top, rw, rc) => ({ lc, lw, top, rw, rc });

test('by-spot validation requires all five spots from 0 to 20 and saves attempts 100 with makes = sum', () => {
  const ok = validateSpots({ spots: { lc: '12', lw: '9', top: '10', rw: 8, rc: '15' }, when: '2026-11-12T10:00' }, now);
  expect(ok.value).toEqual({ at: new Date('2026-11-12T10:00').toISOString(), attempts: 100, makes: 54, spots: spotsOf(12, 9, 10, 8, 15) });
  expect(validateSpots({ spots: { lc: '12', lw: '9', top: '', rw: '8', rc: '15' }, when: '2026-11-12T10:00' }, now).error).toContain('top');
  expect(validateSpots({ spots: { lc: '21', lw: '9', top: '1', rw: '8', rc: '15' }, when: '2026-11-12T10:00' }, now).error).toContain('left corner');
  expect(validateSpots({ spots: { lc: '2.5', lw: '9', top: '1', rw: '8', rc: '15' }, when: '2026-11-12T10:00' }, now).error).toBeTruthy();
  expect(validateSpots({ spots: spotsOf(1, 1, 1, 1, 1), when: '2026-11-13T10:00' }, now).error).toContain('already happened');
});

test('free throws carry kind ft and are summarised separately from threes', () => {
  expect(validateShots({ attempts: '50', makes: '40', when: '2026-11-12T10:00', kind: 'ft' }, now).value).toEqual({ at: new Date('2026-11-12T10:00').toISOString(), attempts: 50, makes: 40, kind: 'ft' });
  expect(validateShots({ attempts: '50', makes: '51', when: '2026-11-12T10:00', kind: 'ft' }, now).error).toContain('0 to 50');
  const s = shootingSummary({
    t: { at: at(1), attempts: 100, makes: 40 },
    f1: { at: at(2), attempts: 50, makes: 40, kind: 'ft' },
    f2: { at: at(3), attempts: 20, makes: null, kind: 'ft' },
  }, now);
  expect(s.count).toBe(1);
  expect(s.attempts).toBe(100);
  expect(s.pct).toBeCloseTo(40);
  expect(s.sessions.map(x => x.id)).toEqual(['t']);
  expect(s.ft.count).toBe(2);
  expect(s.ft.attempts).toBe(70);
  expect(s.ft.makes).toBe(40);
  expect(s.ft.pct).toBeCloseTo(80);
  expect(s.ft.recentPct).toBeCloseTo(80);
  expect(shootingSessions({ f1: { at: at(2), attempts: 50, makes: 40, kind: 'ft' } })[0]).toEqual(expect.objectContaining({ kind: 'ft', spots: null }));
});

test('spot totals across sessions with best and worst spot', () => {
  const s = shootingSummary({
    a: { at: at(1), attempts: 100, makes: 54, spots: spotsOf(12, 9, 10, 8, 15) },
    b: { at: at(2), attempts: 100, makes: 50, spots: spotsOf(10, 11, 10, 6, 13) },
    c: { at: at(3), attempts: 100, makes: 45 },
  }, now);
  expect(s.spotSessions).toBe(2);
  expect(s.spots.map(x => x.id)).toEqual(['lc', 'lw', 'top', 'rw', 'rc']);
  expect(s.spots[0]).toEqual({ id: 'lc', label: 'Left corner', makes: 22, attempts: 40, pct: expect.closeTo(55) });
  expect(s.bestSpot.id).toBe('rc');
  expect(s.bestSpot.pct).toBeCloseTo(70);
  expect(s.worstSpot.id).toBe('rw');
  expect(s.worstSpot.pct).toBeCloseTo(35);
  expect(s.count).toBe(3);
  const none = shootingSummary({ c: { at: at(3), attempts: 100, makes: 45 } }, now);
  expect(none.spots).toEqual([]);
  expect(none.bestSpot).toBeNull();
  expect(none.worstSpot).toBeNull();
});

test('shotLabel names threes and free throws', () => {
  expect(shotLabel({ attempts: 100 })).toBe('100 threes');
  expect(shotLabel({ attempts: 100, kind: 'three' })).toBe('100 threes');
  expect(shotLabel({ attempts: 50, kind: 'ft' })).toBe('50 free throws');
  expect(shotLabel({ attempts: 1, kind: 'ft' })).toBe('1 free throw');
});

test('old sessions without kind or spots still read as threes', () => {
  const log = { old: { at: at(1), attempts: 100, makes: 37 }, odd: { at: at(2), attempts: 100, makes: 30, spots: { lc: 3 } } };
  const sessions = shootingSessions(log);
  expect(sessions[0]).toEqual({ id: 'old', at: new Date(at(1)), attempts: 100, makes: 37, kind: 'three', spots: null });
  expect(sessions[1].spots).toBeNull();
  const s = shootingSummary(log, now);
  expect(s.count).toBe(2);
  expect(s.makes).toBe(67);
  expect(s.ft.count).toBe(0);
  expect(s.ft.pct).toBeNull();
  expect(s.spots).toEqual([]);
});

describe('sheet and card', () => {
  let div, root;
  const flush = async fn => { await act(async () => { if (fn) fn(); }); };
  const setValue = (input, value) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })); };
  const buttonByText = text => [...div.querySelectorAll('button')].find(b => b.textContent === text);
  beforeEach(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; div = document.createElement('div'); document.body.appendChild(div); root = createRoot(div); try { localStorage.clear(); } catch (e) {} });
  afterEach(async () => { await act(async () => root.unmount()); div.remove(); });

  test('by-spot mode saves five spots, shows a live total and is remembered', async () => {
    const onSave = jest.fn();
    await flush(() => root.render(<ThreePointLog onSave={onSave} onDelete={() => {}} onClose={() => {}}/>));
    expect(div.querySelector('[aria-label="Threes made"]')).toBeTruthy();
    await flush(() => buttonByText('By spot').click());
    expect(localStorage.getItem('btd-shot-mode')).toBe('spots');
    const values = { lc: '12', lw: '9', top: '10', rw: '8' };
    for (const [id, v] of Object.entries(values)) await flush(() => setValue(div.querySelector(`#shot-spot-${id}`), v));
    await flush(() => div.querySelector('[aria-label="Add 1 at right corner"]').click());
    expect(div.querySelector('[role="status"]').textContent).toContain('40/100');
    expect(div.querySelector('[role="status"]').textContent).toContain('40% from three');
    await flush(() => buttonByText('Log 100 threes').click());
    expect(onSave).toHaveBeenCalledWith(undefined, expect.objectContaining({ attempts: 100, makes: 40, spots: spotsOf(12, 9, 10, 8, 1) }));
    await act(async () => root.unmount());
    root = createRoot(div);
    await flush(() => root.render(<ThreePointLog onSave={onSave} onDelete={() => {}} onClose={() => {}}/>));
    expect(div.querySelector('#shot-spot-lc')).toBeTruthy();
  });

  test('editing a spot session reopens in spot mode; free-throw sheet talks about free throws', async () => {
    const editing = shootingSessions({ s: { at: at(1), attempts: 100, makes: 54, spots: spotsOf(12, 9, 10, 8, 15) } })[0];
    await flush(() => root.render(<ThreePointLog editing={editing} onSave={() => {}} onDelete={() => {}} onClose={() => {}}/>));
    expect(div.querySelector('#shot-spot-rc').value).toBe('15');
    expect(localStorage.getItem('btd-shot-mode')).toBeNull();
    const onSave = jest.fn();
    await flush(() => root.render(<FreeThrowLog onSave={onSave} onDelete={() => {}} onClose={() => {}}/>));
    expect(div.querySelector('h2').textContent).toBe('50 free throws');
    expect(buttonByText('By spot')).toBeUndefined();
    await flush(() => setValue(div.querySelector('[aria-label="Free throws made"]'), '41'));
    expect(div.textContent).toContain('82% from the line');
    await flush(() => buttonByText('Log 50 free throws').click());
    expect(onSave).toHaveBeenCalledWith(undefined, expect.objectContaining({ attempts: 50, makes: 41, kind: 'ft' }));
  });

  test('full card shows spot breakdown with best/worst text and a free-throw line', async () => {
    const onLogFt = jest.fn();
    const log = { a: { at: at(1), attempts: 100, makes: 54, spots: spotsOf(12, 9, 10, 8, 15) }, f: { at: at(1), attempts: 50, makes: 40, kind: 'ft' } };
    await flush(() => root.render(<ShootingCard log={log} onLog={() => {}} onLogFt={onLogFt}/>));
    const list = div.querySelector('[aria-label="Three-point percentage by spot"]');
    expect(list.textContent).toContain('Right corner · Best');
    expect(list.textContent).toContain('Right wing · Needs work');
    expect(div.querySelector('[aria-label="Free throws"]').textContent).toContain('80%');
    await flush(() => buttonByText('Log free throws').click());
    expect(onLogFt).toHaveBeenCalled();
    await flush(() => root.render(<ShootingCard log={log} compact/>));
    expect(div.querySelector('[aria-label="Free throws"]')).toBeNull();
    expect(div.querySelector('[aria-label="Three-point percentage by spot"]')).toBeNull();
  });
});
