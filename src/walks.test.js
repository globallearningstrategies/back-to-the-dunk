import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { normalizeAll, engineLoadOf, engineModel, BRISK_WALK } from './model';
import { WalkLogger } from './logging';
import { buildFeed } from './ActivityLog';

const row = (id, pace, duration = 45) => ({ id, session_name: 'Treadmill Walk', logged_at: '2026-11-17T08:00:00Z',
  exercises: [{ name: `${pace === 'brisk' ? 'Brisk · ' : ''}${duration} min`, duration, pace }] });

test('brisk walks earn full Engine credit at effort 4; easy and older walks keep half credit at effort 3', () => {
  const [brisk, easy, legacy] = normalizeAll([], [row(1, 'brisk'), row(2, 'easy'), { ...row(3), exercises: [{ duration: 45 }] }]);
  expect(brisk).toMatchObject({ type: 'walk', pace: 'brisk', rpe: BRISK_WALK.rpe });
  expect(engineLoadOf(brisk)).toBe(45 * 4);
  expect(engineLoadOf(easy)).toBe(45 * 0.5 * 3);
  expect(engineLoadOf(legacy)).toBe(45 * 0.5 * 3);
  const asOf = new Date('2026-11-17T20:00:00Z');
  expect(engineModel([brisk], asOf).score).toBeGreaterThan(engineModel([easy], asOf).score * 2.5);
});

test('the activity log names brisk walks', () => {
  const feed = buildFeed([], [row(1, 'brisk'), row(2, 'easy')], {});
  expect(feed.map(f => f.title).sort()).toEqual(['Brisk walk', 'Walk']);
  expect(feed.find(f => f.title === 'Brisk walk').detail).toBe('45 min');
});

describe('walk logger', () => {
  let root, div;
  const flush = async fn => act(async () => { if (fn) fn(); await Promise.resolve(); });
  beforeEach(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; div = document.createElement('div'); document.body.appendChild(div); root = createRoot(div); });
  afterEach(async () => { await flush(() => root.unmount()); div.remove(); });
  const click = async label => { const b = [...div.querySelectorAll('button')].find(x => x.textContent.trim() === label || x.textContent.startsWith(label)); expect(b).toBeTruthy(); await flush(() => b.click()); };

  test('opens on brisk pace, explains the talk test, previews credit and saves the pace', async () => {
    const save = jest.fn();
    await flush(() => root.render(<WalkLogger state={{ open: true, pace: 'brisk' }} onClose={() => {}} onSave={save}/>));
    expect(div.textContent).toContain('Log a brisk walk');
    expect(div.textContent).toContain('you couldn’t sing');
    await click('Log brisk walk');
    expect(save).not.toHaveBeenCalled();
    expect(div.querySelector('[role="alert"]').textContent).toContain('minutes');
    await click('45 min');
    expect(div.textContent).toContain('Adds about +4.3');
    await click('Log brisk walk');
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ duration: '45', pace: 'brisk' }));
  });

  test('switching to easy changes the credit and the saved pace', async () => {
    const save = jest.fn();
    await flush(() => root.render(<WalkLogger state={{ open: true, pace: 'brisk' }} onClose={() => {}} onSave={save}/>));
    await click('45 min');
    await flush(() => div.querySelector('[role="radio"][aria-checked="false"]').click());
    expect(div.textContent).toContain('Adds about +1.6');
    await click('Log walk');
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ pace: 'easy' }));
  });
});
