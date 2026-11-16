import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { GameDayWarmup, WARMUP_PHASES, WARMUP_DRILLS, WARMUP_SECONDS } from './GameDayWarmup';
import { EngineHome } from './engine-ui';
import { DEFAULT_PREFERENCES } from './engine';
import { isGameNight, setFeedbackPreferences } from './model';

let root, div;
const flush = async fn => act(async () => { if (fn) fn(); await Promise.resolve(); });
const btn = label => [...div.querySelectorAll('button')].find(b => b.textContent.trim() === label);
const click = async label => { expect(btn(label)).toBeTruthy(); await flush(() => btn(label).click()); };
const drill = () => div.querySelector('#warmup-title').textContent;
const tick = async ms => act(async () => { jest.advanceTimersByTime(ms); await Promise.resolve(); });
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  setFeedbackPreferences({ sound: false, vibration: true });
  navigator.vibrate = jest.fn();
  div = document.createElement('div'); document.body.appendChild(div); root = createRoot(div);
});
afterEach(async () => { await flush(() => root.unmount()); div.remove(); jest.useRealTimers(); });

test('routine is the 10-minute, 4-phase plan with the requested phase lengths', () => {
  expect(WARMUP_SECONDS).toBe(600);
  expect(WARMUP_PHASES.map(p => p.drills.reduce((s, d) => s + d.seconds, 0))).toEqual([180, 180, 120, 120]);
  expect(WARMUP_DRILLS.map(d => d.seconds)).toEqual([90, 90, 60, 60, 60, 30, 90, 60, 60]);
});

test('timer counts down, auto-advances, and vibrates on a phase change; Skip moves on', async () => {
  jest.useFakeTimers();
  await flush(() => root.render(<GameDayWarmup onClose={() => {}}/>));
  expect(drill()).toBe('Light Jogging & High Skips');
  await click('Start timer');
  await tick(30000);
  expect(div.querySelector('[role="timer"]').textContent).toBe('1:00');
  await tick(61000);
  expect(drill()).toBe('Side Shuffles & Carioca');
  navigator.vibrate.mockClear();
  await tick(90000);
  expect(drill()).toBe('Walking Lunges with a Twist');
  expect(div.textContent).toContain('Phase 2 of 4');
  expect(navigator.vibrate).toHaveBeenCalledWith([120, 80, 120]);
  await click('Skip ›');
  expect(drill()).toBe('Leg Swings');
  expect(div.querySelector('[role="timer"]').textContent).toBe('1:00');
  await click('Pause');
  await tick(20000);
  expect(drill()).toBe('Leg Swings');
  expect(btn('Resume')).toBeTruthy();
});

test('a locked phone catches up through several drills when the timer resumes ticking', async () => {
  jest.useFakeTimers();
  await flush(() => root.render(<GameDayWarmup onClose={() => {}}/>));
  await click('Start timer');
  jest.setSystemTime(Date.now() + 245000);   // 90 + 90 + 60 = 240s gone, 5s into Leg Swings
  await tick(250);
  expect(drill()).toBe('Leg Swings');
  expect(div.querySelector('[role="timer"]').textContent).toBe('0:55');
  expect([...div.querySelectorAll('[role="checkbox"][aria-checked="true"]')]).toHaveLength(3);
});

test('manual mode: Next and check-off move through the routine without a timer', async () => {
  await flush(() => root.render(<GameDayWarmup onClose={() => {}}/>));
  expect(div.querySelector('[role="timer"]').textContent).toBe('1:30');
  await click('Next ›');
  expect(drill()).toBe('Side Shuffles & Carioca');
  const current = div.querySelector('[role="checkbox"][data-current="true"]');
  await flush(() => current.click());
  expect(drill()).toBe('Walking Lunges with a Twist');
  await click('‹ Back');
  expect(drill()).toBe('Side Shuffles & Carioca');
  for (let i = 0; i < WARMUP_DRILLS.length; i++) if (btn('Next ›')) await click('Next ›');
  expect(drill()).toContain('You’re warm');
  expect(div.textContent).toContain(`${WARMUP_DRILLS.length} of ${WARMUP_DRILLS.length} drills done`);
});

test('the warm-up card leads Today on game night and is still one tap away on other days', async () => {
  const thursday = new Date('2026-11-19T18:00:00');
  expect(isGameNight({ gameDow: 4 }, thursday)).toBe(true);
  expect(isGameNight({ gameDow: 4 }, new Date('2026-11-18T18:00:00'))).toBe(false);
  expect(isGameNight({ gameDow: 4, gameWeekId: '2026-11-16', gameDates: ['2026-11-17'] }, thursday)).toBe(false);
  const start = jest.fn();
  const render = constraints => flush(() => root.render(<EngineHome all={[]} cardioSessions={[]} constraints={constraints} preferences={DEFAULT_PREFERENCES} courtRatings={{}} onRate={() => {}} onStart={() => {}} onGoTab={() => {}} onQuickAdd={() => {}} onWarmup={start}/>));
  await render({ gameDow: new Date().getDay() });
  expect(div.querySelector('section').getAttribute('aria-label')).toBe('Basketball game warm-up');
  expect(div.textContent).toContain('Game night');
  await click('Start warm-up'); expect(start).toHaveBeenCalledTimes(1);
  await render({ gameDow: (new Date().getDay() + 3) % 7 });
  expect(div.querySelector('section').getAttribute('aria-label')).not.toBe('Basketball game warm-up');
  expect(div.querySelector('[aria-label="Basketball game warm-up"]')).toBeTruthy();
});
