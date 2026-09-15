import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { FastBreakLog, FAST_BREAK_NOTES } from './FastBreakLog';

let root, div;
const flush = async fn => act(async () => { if (fn) fn(); await Promise.resolve(); });
const fill = async (label, value) => flush(() => {
  const input = div.querySelector(`[aria-label="${label}"]`);
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value);
  input.dispatchEvent(new Event('input', {bubbles:true}));
});
const submit = () => div.querySelector('form').dispatchEvent(new Event('submit', {bubbles:true,cancelable:true}));
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  div = document.createElement('div'); document.body.appendChild(div); root = createRoot(div);
});
afterEach(async () => { await flush(() => root.unmount()); div.remove(); });

test.each([12,15])('quick log records %i actual minutes and chosen effort without a timer', async minutes => {
  const save = jest.fn().mockResolvedValue(true), close = jest.fn();
  await flush(() => root.render(<FastBreakLog onSave={save} onClose={close}/>));
  await fill('Sprint duration', String(minutes)); await fill('Sprint effort', '7');
  await fill('Sprint date', '2026-01-10T12:00'); await flush(submit);
  expect(save).toHaveBeenCalledWith({type:'long_interval', duration_min:minutes, rpe:7, notes:FAST_BREAK_NOTES, completed_at:new Date('2026-01-10T12:00').toISOString()});
  expect(close).toHaveBeenCalledTimes(1);
});

test('invalid input is blocked, pending saves cannot duplicate, and failures preserve details for retry', async () => {
  let finish;
  const save = jest.fn().mockImplementation(() => new Promise(resolve => { finish = resolve; })), close = jest.fn();
  await flush(() => root.render(<FastBreakLog onSave={save} onClose={close}/>));
  await fill('Sprint duration', '0'); await flush(submit); expect(save).not.toHaveBeenCalled();
  await fill('Sprint duration', '12'); await fill('Sprint effort', '6');
  await flush(() => {submit(); submit();}); expect(save).toHaveBeenCalledTimes(1);
  await flush(() => finish(false));
  expect(close).not.toHaveBeenCalled(); expect(div.querySelector('[role="alert"]').textContent).toContain('wasn’t saved');
  expect(div.querySelector('[aria-label="Sprint duration"]').value).toBe('12');
  await flush(submit); expect(save).toHaveBeenCalledTimes(2);
  await flush(() => finish(true)); expect(close).toHaveBeenCalledTimes(1);
});
