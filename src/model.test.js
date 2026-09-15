import { computeGameState } from './model';
test('lifetime achievements include every session beyond the previous 60-row cutoff', () => {
  const sessions=Array.from({length:90},(_,i)=>({ id:String(i), workout_type:'tabata', duration_min:4, rpe:8, completed_at:new Date(2025,9,i+1,12).toISOString() }));
  const full=computeGameState([],sessions,[]);
  const partial=computeGameState([],sessions.slice(-60),[]);
  expect(full.stats.totalSessions).toBe(90);
  expect(full.totalXP).toBeGreaterThan(partial.totalXP);
  expect(full.stats.bestStreak).toBe(90);
});
test('consecutive local days retain a streak across the daylight-saving transition', () => {
  const sessions=[7,8,9].map(day=>({ workout_type:'tabata', duration_min:4, rpe:8, completed_at:new Date(2026,2,day,12).toISOString() }));
  expect(computeGameState([],sessions,[]).stats.bestStreak).toBe(3);
});
