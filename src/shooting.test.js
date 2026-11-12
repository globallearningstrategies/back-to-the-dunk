import { shootingSummary, validateShots, shootingSessions } from './shooting';

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
