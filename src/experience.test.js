import React, { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { TodayAction, CourtCheckIn } from './engine-ui';
import { FoodJournal } from './FoodJournal';
import { TrainWorkspace } from './WorkoutFlow';
import { DEFAULT_PREFERENCES, nutritionTotals } from './engine';
import { DEFAULT_BODY, accountKey } from './data/storage';
import { useWorkoutDraft } from './data/useWorkoutDraft';
import { toLocalInput } from './logging';
import { setFeedbackPreferences, todayKey } from './model';

let root,div;
const flush=async fn=>act(async()=>{if(fn)fn();await Promise.resolve();});
beforeEach(()=>{
  globalThis.IS_REACT_ACT_ENVIRONMENT=true;localStorage.clear();window.scrollTo=jest.fn();
  setFeedbackPreferences({sound:false,vibration:false});
  div=document.createElement('div');document.body.appendChild(div);root=createRoot(div);
});
afterEach(async()=>{await flush(()=>root.unmount());div.remove();jest.useRealTimers();});
const button=name=>[...div.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')===name || b.textContent===name);
const click=async name=>{expect(button(name)).toBeTruthy();await flush(()=>button(name).click());};
const fill=async(input,value)=>flush(()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));});

test('recovery day uses a recovery action and has no daily streak pressure',async()=>{
  await flush(()=>root.render(<TodayAction all={[]} constraints={{restDows:[new Date().getDay()]}} preferences={DEFAULT_PREFERENCES} onPlan={()=>{}} onStart={()=>{}} onChange={()=>{}}/>));
  expect(button('View recovery plan')).toBeTruthy();expect(button('Start workout')).toBeUndefined();
  expect(div.textContent).toContain('Recovery counts');expect(div.textContent).not.toContain('streak');
});

test('court rating stores the selected game ID independently of its Engine calculation',async()=>{
  const rate=jest.fn(),when=new Date(Date.now()-86400000).toISOString();
  const game={id:'game-1',workout_type:'game',completed_at:when,duration_min:40,rpe:8};
  await flush(()=>root.render(<CourtCheckIn games={[game]} all={[{id:'game-1',type:'game',date:new Date(when),duration:40,rpe:8}]} ratings={{}} onRate={rate}/>));
  expect(div.textContent).toContain('Engine entering the game: 0.0');await click('Strong');expect(rate).toHaveBeenCalledWith('game-1','strong');
});

function JournalHarness(){
  const [entries,setEntries]=useState({}),[favorites,setFavorites]=useState({});
  const totals=nutritionTotals({[todayKey()]:10},{[todayKey()]:100},entries);
  return <FoodJournal entries={entries} favorites={favorites} onEntry={(id,v)=>setEntries(p=>({...p,[id]:v}))} onFavorite={(id,v)=>setFavorites(p=>({...p,[id]:v}))} proteinLog={totals.protein} calorieLog={totals.calories} bodyStats={DEFAULT_BODY}/>;
}
test('food portions and edits update totals without duplicating legacy amounts',async()=>{
  await flush(()=>root.render(<JournalHarness/>));await click('Add food');
  const inputs=[...div.querySelectorAll('form input')];
  await fill(inputs[0],'Test meal');await fill(inputs[1],'20');await fill(inputs[2],'200');await fill(inputs[3],'2');
  await flush(()=>div.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
  expect(div.querySelector('.engine-grid').textContent).toContain('50g');await click('Save favorite');expect(button('Add Test meal')).toBeTruthy();
  await click('Edit');await fill([...div.querySelectorAll('form input')][3],'1');await flush(()=>div.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
  expect(div.querySelector('.engine-grid').textContent).toContain('30g');await click('Delete');expect(div.querySelector('.engine-grid').textContent).toContain('10g');
});

function WorkoutHarness({save=async()=>false}){
  const draft=useWorkoutDraft('test-account',toLocalInput(new Date()));
  return <TrainWorkspace draft={draft} history={[]} onSaveLift={save} onSaveConditioning={save} busy={false}/>;
}
test('focused sets persist precise weights and allow a partial workout review',async()=>{
  localStorage.setItem(accountKey('test-account','workout-draft'),JSON.stringify({version:1,activeSession:0,checked:{},vals:{},liftDate:toLocalInput(new Date()),flow:{active:true,mode:'lift',index:0}}));
  const save=jest.fn().mockResolvedValue(false);await flush(()=>root.render(<WorkoutHarness save={save}/>));
  await fill(div.querySelector('[aria-label="Barbell Squat set 1 weight"]'),'110');await click('Complete set 1');await click('Finish early & review');await click('Save workout');
  expect(save).toHaveBeenCalled();expect(div.textContent).toContain('Review your workout');
  const draft=JSON.parse(localStorage.getItem(accountKey('test-account','workout-draft')));
  expect(draft.vals.lift_a1.setWeights[0]).toBe(110);expect(draft.vals.lift_a1.completedSets[0]).toBe(true);expect(draft.checked.lift_a1).toBe(false);
});

test('interval reload uses persisted elapsed time and saves actual duration and chosen effort',async()=>{
  jest.useFakeTimers();jest.setSystemTime(new Date('2026-09-15T12:00:00'));
  localStorage.setItem(accountKey('test-account','workout-draft'),JSON.stringify({version:1,activeSession:0,checked:{},vals:{},liftDate:toLocalInput(new Date()),flow:{active:true,mode:'tabata',minutes:4,timer:{elapsed:10,startedAt:Date.now()-20000,running:true}}}));
  const save=jest.fn().mockResolvedValue(false);await flush(()=>root.render(<WorkoutHarness save={save}/>));
  await click('Pause');await click('Finish early');await fill(div.querySelector('[aria-label="Session effort"]'),'6');await click('Save session');
  expect(save).toHaveBeenCalledWith(expect.objectContaining({duration_min:.5,rpe:6,workout_type:'tabata'}));
  expect(div.textContent).toContain('Record what you did');
  const draft=JSON.parse(localStorage.getItem(accountKey('test-account','workout-draft')));expect(draft.flow.timer.running).toBe(false);expect(draft.flow.timer.elapsed).toBe(30);
});

test.each([
  ['running fast break','long_interval',30,true],
  ['paused Tabata','tabata',30,false],
  ['completed fast break','long_interval',600,false],
  ['unstarted Tabata','tabata',0,false],
])('exit closes a %s without saving, preserves lifts, and stays closed after reload',async(_label,mode,elapsed,running)=>{
  const key=accountKey('test-account','workout-draft');
  const vals={lift_a1:{setsDone:'1',setWeights:{0:110},completedSets:{0:true}}};
  localStorage.setItem(key,JSON.stringify({version:1,activeSession:0,checked:{},vals,liftDate:toLocalInput(new Date()),flow:{active:true,mode,minutes:mode==='tabata'?4:10,timer:{elapsed,startedAt:running?Date.now():null,running}}}));
  const save=jest.fn();
  await flush(()=>root.render(<WorkoutHarness save={save}/>));
  await click('Exit timer');
  expect(save).not.toHaveBeenCalled();
  expect(div.textContent).toContain('Timer closed. No session was logged.');
  const saved=JSON.parse(localStorage.getItem(key));
  expect(saved.flow).toEqual({active:false,mode:'lift'}); expect(saved.vals).toEqual(vals);
  await flush(()=>root.unmount());root=createRoot(div);await flush(()=>root.render(<WorkoutHarness save={save}/>));
  expect(button('Exit timer')).toBeUndefined();
  expect(button('Log 10 sprints')).toBeTruthy();
  expect(div.querySelector('details').open).toBe(false);
});
