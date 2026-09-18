import { engineModel, startOfWeek } from './model';
import { engineBeforeGame, exerciseRecord, nutritionTotals, weeklyProgress } from './engine';

const activity = (type,date,duration,rpe,extra={}) => ({type,date:new Date(date),duration,rpe,...extra});

test('Engine weighting: games/walks unchanged, lifting excluded, strength classes at 60%',()=>{
  const sessions=[activity('game','2026-09-01T19:00:00',60,8),activity('walk','2026-09-02T09:00:00',30,3),activity('lift','2026-09-02T12:00:00',60,10),activity('cross_training','2026-09-03T12:00:00',40,8,{focus:'upper'}),activity('tabata','2026-09-03T18:00:00',4,9)];
  const decay=41/42;
  // Strength-focus Sweat440 (40 min × RPE 8 = 320 load) earns 60% aerobic credit: 192.
  expect(engineModel(sessions,new Date('2026-09-04T12:00:00')).score).toBeCloseTo(480/42*decay**3+45/42*decay**2+(36+192)/42*decay,10);
});
test('Engine entering a game excludes that game and later activity on the same day',()=>{
  const all=[activity('tabata','2026-09-01T10:00:00',4,8,{id:'prior'}),activity('game','2026-09-02T19:00:00',60,10,{id:'game'}),activity('long_interval','2026-09-02T21:00:00',40,10,{id:'later'})];
  expect(engineBeforeGame(all,{id:'game',completed_at:'2026-09-02T19:00:00'})).toBeCloseTo(32/42*41/42,10);
  expect(engineModel(all,new Date('2026-08-01T00:00:00')).score).toBe(0);
});
test('weekly totals use Monday–Sunday, exclude future logs, and preserve saved goals',()=>{
  const all=[activity('walk','2026-09-13T12:00:00',20,3),activity('game','2026-09-14T12:00:00',40,8),activity('lift','2026-09-15T12:00:00',30,6),activity('tabata','2026-09-20T12:00:00',4,8)];
  const progress=weeklyProgress(all,5,{'2026-09-07':1,'2026-09-14':2},new Date('2026-09-15T13:00:00'));
  expect(progress.count).toBe(2);expect(progress.goal).toBe(2);expect(progress.weeksMet).toBe(2);expect(progress.best).toBe(2);
  expect(startOfWeek(new Date('2026-09-20T20:00:00')).getDate()).toBe(14);
});
test('partial and nonconsecutive sets retain actual reps and per-set weights',()=>{
  const record=exerciseRecord({name:'Squat',sets:4,reps:6,barbell:true},{completedSets:{0:true,1:false,2:true},customReps:{0:5,2:4},setWeights:{0:100,2:110}});
  expect(record).toMatchObject({sets:2,reps:'5,4',volume:940,set_details:[{reps:5,weight:100},{reps:4,weight:110}]});
  expect(exerciseRecord({name:'Squat',sets:4,reps:6},{completedSets:{0:false}},true)).toBeNull();
  expect(exerciseRecord({name:'Squat',sets:4,reps:6},{setsDone:'1',weight:'50'}).volume).toBe(300);
});
test('food journal adds to legacy totals once and omits deleted entries',()=>{
  const entries={a:{day:'2026-09-15',protein:20,calories:100,portions:2},b:null};
  expect(nutritionTotals({'2026-09-15':30},{'2026-09-15':300},entries)).toEqual({protein:{'2026-09-15':70},calories:{'2026-09-15':500}});
});
