import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { seasonRanges, currentSeason, filterSeason, inSeason, defaultSeasonName, ALL_TIME, SeasonSettings } from './seasons';
import { SeasonStats } from './engine-ui';
import { ConditioningLogger } from './logging';

const seasons = [{ id: 'b', name: 'Winter 2026–27', start: '2026-11-01' }, { id: 'a', name: 'Fall 2026', start: '2026-09-01' }];
const g = (id, date, extra = {}) => ({ id, workout_type: 'game', completed_at: `${date}T19:00:00`, duration_min: 44, rpe: 8, ...extra });

test('seasons run from their start until the next season starts', () => {
  const r = seasonRanges(seasons);
  expect(r.map(x => [x.id, x.end])).toEqual([['a', '2026-11-01'], ['b', null]]);
  expect(currentSeason(seasons, new Date('2026-10-15T12:00:00')).id).toBe('a');
  expect(currentSeason(seasons, new Date('2026-11-23T12:00:00')).id).toBe('b');
  expect(currentSeason([], new Date())).toBe(ALL_TIME);
  expect(currentSeason(seasons, new Date('2026-08-01T12:00:00'))).toBe(ALL_TIME);
  const games = [g(1, '2026-10-30'), g(2, '2026-11-01'), g(3, '2026-11-20')];
  expect(filterSeason(games, r[1]).map(x => x.id)).toEqual([2, 3]);
  expect(filterSeason(games, r[0]).map(x => x.id)).toEqual([1]);
  expect(inSeason('2020-01-01', ALL_TIME)).toBe(true);
  expect(defaultSeasonName(new Date('2026-12-05'))).toBe('Winter 2026–27');
  expect(defaultSeasonName(new Date('2027-01-05'))).toBe('Winter 2026–27');
});

describe('screens', () => {
  let root, div;
  const flush = async fn => act(async () => { if (fn) fn(); await Promise.resolve(); });
  const fill = async (label, value) => flush(() => { const i = div.querySelector(`[aria-label="${label}"]`); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(i, value); i.dispatchEvent(new Event('input', { bubbles: true })); });
  const submit = () => flush(() => div.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  beforeEach(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; div = document.createElement('div'); document.body.appendChild(div); root = createRoot(div); });
  afterEach(async () => { await flush(() => root.unmount()); div.remove(); });

  test('season settings adds a season and rejects a duplicate start date', async () => {
    const change = jest.fn();
    await flush(() => root.render(<SeasonSettings seasons={seasons} onChange={change}/>));
    await fill('Season name', 'Spring league'); await fill('Season start', '2026-11-01'); await submit();
    expect(div.querySelector('[role="alert"]').textContent).toContain('already starts');
    await fill('Season start', '2027-03-01'); await submit();
    expect(change).toHaveBeenCalledWith([...seasons, expect.objectContaining({ name: 'Spring league', start: '2027-03-01' })]);
  });

  test('season stats show assists, steals and threes when logged', async () => {
    await flush(() => root.render(<SeasonStats seasonName="Winter 2026–27" games={[g(1, '2026-11-10', { points: 12, rebounds: 6, assists: 4, steals: 2, threes_made: 2 }), g(2, '2026-11-17', { points: 18, rebounds: 8, assists: 2 })]}/>));
    expect(div.textContent).toContain('Box score · Winter 2026–27');
    expect(div.textContent).toContain('Assists / game3');
    expect(div.textContent).toContain('Steals / game2');
    expect(div.textContent).toContain('18 pts · 8 reb · 2 ast');
  });

  test('the game logger saves assists, steals and threes, and checks threes against points', async () => {
    const save = jest.fn();
    await flush(() => root.render(<ConditioningLogger state={{ open: true, prefillType: 'game', lockType: true }} onClose={() => {}} onSave={save} onDelete={() => {}}/>));
    await fill('Points', '5'); await fill('Threes made', '2'); await submit();
    expect(div.querySelector('[role="alert"]').textContent).toContain('more than your points');
    await fill('Points', '14'); await fill('Assists', '3'); await fill('Steals', '1'); await submit();
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ type: 'game', points: 14, assists: 3, steals: 1, threes_made: 2 }));
  });
});
