import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { normalizeAll, recommend, addDays, startOfDay, isRecoveryPlan, weightProjection } from './model';
import { dayBeforeKind, gameInsights } from './insights';
import { EngineHome, SeasonStats } from './engine-ui';
import { WeightScreen, BodySettings } from './WeightScreen';
import { DEFAULT_PREFERENCES } from './engine';

const at = (daysAgo, hour = 19) => { const d = startOfDay(addDays(new Date(), -daysAgo)); d.setHours(hour); return d.toISOString(); };
const game = (id, daysAgo, points, rebounds) => ({ id, workout_type: 'game', completed_at: at(daysAgo), duration_min: 44, rpe: 8, points, rebounds });
const tabata = (id, daysAgo) => ({ id, workout_type: 'tabata', completed_at: at(daysAgo, 8), duration_min: 4, rpe: 8 });

describe('game insights', () => {
  const cardio = [game('g1', 1, 20, 8), tabata('t1', 2), game('g2', 8, 12, 5), tabata('t2', 9), game('g3', 15, 18, 7), game('g4', 22, 22, 9)];
  const all = normalizeAll(cardio, []);
  test('classifies the day before each game', () => {
    expect(dayBeforeKind(all, cardio[0])).toEqual({ kind: 'hard', label: 'Tabata' });
    expect(dayBeforeKind(all, cardio[4])).toEqual({ kind: 'light', label: 'Rest' });
  });
  test('compares points after hard vs light days and splits by Engine', () => {
    const r = gameInsights(cardio, all, { g1: 'strong', g2: 'struggled' });
    expect(r.hard).toMatchObject({ statGames: 2, points: 16, rebounds: 6.5, strongShare: 0.5 });
    expect(r.light).toMatchObject({ statGames: 2, points: 20, rebounds: 8 });
    expect(r.comparable).toBe(true);
    expect(r.engineSplit.each).toBe(2);
  });
  test('needs two games on each side before comparing', () => {
    expect(gameInsights(cardio.slice(0, 2), normalizeAll(cardio.slice(0, 2), [])).comparable).toBe(false);
  });
});

describe('planner walks', () => {
  const wed = new Date('2026-11-18T09:00:00'); // Wednesday; game night Thursday
  test('the day before a game stays easy', () => {
    const r = recommend(normalizeAll([tabata('t', 3)], []), wed, { gameDow: 4 });
    expect(isRecoveryPlan(r.items)).toBe(true);
  });
  test('an open day after hard work suggests a brisk walk', () => {
    const tue = new Date('2026-11-17T09:00:00');
    const r = recommend(normalizeAll([{ ...tabata('t', 0), completed_at: '2026-11-16T08:00:00' }], []), tue, { gameDow: 4 });
    expect(r.items).toEqual([{ type: 'walk', pace: 'brisk' }]);
    expect(isRecoveryPlan(r.items)).toBe(false);
  });
  test('the day after a game stays easy', () => {
    const fri = new Date('2026-11-20T09:00:00');
    const r = recommend(normalizeAll([{ ...game('g', 0), completed_at: '2026-11-19T19:00:00' }], []), fri, { gameDow: 4 });
    expect(isRecoveryPlan(r.items)).toBe(true);
  });
});

test('weight projection works for a gaining goal too', () => {
  const log = [0, 7, 14, 21].map((d, i) => ({ logged_at: new Date(Date.now() - d * 86400000).toISOString(), weight: 180 - i }));
  expect(weightProjection(log, 190, 177).eta).toBeInstanceOf(Date);
  expect(weightProjection(log, 175, 185).stalled).toBe(true);
});

describe('screens', () => {
  let root, div;
  const flush = async fn => act(async () => { if (fn) fn(); await Promise.resolve(); });
  const btn = t => [...div.querySelectorAll('button')].find(b => b.textContent.trim() === t);
  const fill = async (label, value) => flush(() => { const i = div.querySelector(`[aria-label="${label}"]`); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(i, value); i.dispatchEvent(new Event('input', { bubbles: true })); });
  beforeEach(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; div = document.createElement('div'); document.body.appendChild(div); root = createRoot(div); });
  afterEach(async () => { await flush(() => root.unmount()); div.remove(); });

  const home = props => <EngineHome all={[]} cardioSessions={[]} constraints={{ gameDow: new Date().getDay() }} preferences={DEFAULT_PREFERENCES} courtRatings={{}} onRate={() => {}} onStart={() => {}} onGoTab={() => {}} onQuickAdd={() => {}} onWarmup={() => {}} {...props}/>;
  test('after the warm-up, game night offers "Log tonight’s game" until a game is logged', async () => {
    const log = jest.fn();
    await flush(() => root.render(home({ onLogGame: log, warmedUp: true })));
    expect(div.querySelector('section').getAttribute('aria-label')).toBe("Log tonight's game");
    await flush(() => btn('Log tonight’s game').click()); expect(log).toHaveBeenCalled();
    await flush(() => root.render(home({ onLogGame: log, warmedUp: true, cardioSessions: [game('g', 0, 10, 5)] })));
    expect(div.querySelector('[aria-label="Log tonight\'s game"]')).toBeNull();
  });

  test('season stats has an edit link for the last game', async () => {
    const edit = jest.fn(), g = game('g1', 1, 14, 6);
    await flush(() => root.render(<SeasonStats games={[g]} onEdit={edit}/>));
    await flush(() => div.querySelector('[aria-label="Edit last game"]').click());
    expect(edit).toHaveBeenCalledWith(g);
  });

  test('weight screen uses your own start and goal', async () => {
    const log = [{ id: 1, weight: 190, logged_at: new Date().toISOString() }];
    await flush(() => root.render(<WeightScreen weightLog={log} body={{ startWeight: 200, goalWeight: 180 }} onLog={() => true} onDelete={() => {}} onEditGoal={() => {}}/>));
    expect(div.textContent).toContain('Start 200');
    expect(div.textContent).toContain('Goal 180');
    expect(div.textContent).toContain('10 lb to go');
    expect(div.querySelector('[role="progressbar"]').getAttribute('aria-valuenow')).toBe('50');
  });

  test('body settings validates and saves height, age, start and goal', async () => {
    const save = jest.fn();
    await flush(() => root.render(<BodySettings body={{ heightInches: 77, age: 47 }} latestWeight={214} onSave={save}/>));
    await fill('Goal weight', '225');
    await flush(() => div.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    expect(div.querySelector('[role="alert"]').textContent).toContain('differ');
    await flush(() => btn('Start from today’s weight').click());
    await fill('Goal weight', '200');
    await flush(() => div.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ heightInches: 77, age: 47, startWeight: 214, goalWeight: 200 }));
  });
});

test('10 sprints are named as sprints in Today’s activity and in plans, not "Long Interval"', async () => {
  const { sessionLabel, planItemLabel, FAST_BREAK_NOTES } = require('./model');
  const [sprints, other] = normalizeAll([
    { id: 's', workout_type: 'long_interval', completed_at: at(0, 11), duration_min: 10, rpe: 9, notes: FAST_BREAK_NOTES },
    { id: 'o', workout_type: 'long_interval', completed_at: at(0, 12), duration_min: 20, rpe: 9, notes: null },
  ], []);
  expect(sessionLabel(sprints)).toBe('10 sprints');
  expect(sessionLabel(other)).toBe('Long Interval');
  expect(planItemLabel({ type: 'long_interval' })).toBe('10 sprints');
  const div = document.createElement('div'); document.body.appendChild(div); const root = createRoot(div);
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  await act(async () => root.render(<EngineHome all={[sprints]} cardioSessions={[]} constraints={{}} preferences={DEFAULT_PREFERENCES} courtRatings={{}} onRate={() => {}} onStart={() => {}} onGoTab={() => {}} onQuickAdd={() => {}}/>));
  expect(div.querySelector('[aria-label="Today\'s activity"]').textContent).toContain('10 sprints');
  expect(div.querySelector('[aria-label="Today\'s activity"]').textContent).not.toContain('Long Interval');
  await act(async () => root.unmount()); div.remove();
});
