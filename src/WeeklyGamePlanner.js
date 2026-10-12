import React, { useMemo, useState } from 'react';
import { C } from './model';

const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const keyOf = d => [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
const add = (d,n) => { const x=new Date(d); x.setDate(x.getDate()+n); return x; };
const monday = d => { const x=new Date(d); x.setHours(0,0,0,0); x.setDate(x.getDate()-((x.getDay()+6)%7)); return x; };

function build(start,games,classes,sprints,all) {
  const keys=Array.from({length:7},(_,i)=>keyOf(add(start,i)));
  const before=new Set(games.map(k=>keyOf(add(new Date(k+'T12:00:00'),-1))));
  const after=new Set(games.map(k=>keyOf(add(new Date(k+'T12:00:00'),1))));
  const logged=new Map(), loggedHard=new Set(); (all||[]).forEach(s=>{const k=keyOf(new Date(s.date));logged.set(k,[...(logged.get(k)||[]),s]);if(['game','cross_training','long_interval','tabata','lift'].includes(s.type))loggedHard.add(k);});
  const hard=new Set([...games,...loggedHard]), assigned={};
  const available=k=>{const d=new Date(k+'T12:00:00');return d.getDay()!==6&&!games.includes(k)&&!before.has(k)&&!after.has(k)&&!logged.has(k)&&!hard.has(keyOf(add(d,-1)))&&!hard.has(keyOf(add(d,1)));};
  games.forEach(k=>assigned[k]={kind:'game',title:'Basketball game',detail:'Your priority session. Arrive fresh.'});
  let n=0; for(const i of [0,2,1,3,4,6,5]){const k=keys[i];if(n>=classes)break;if(available(k)){assigned[k]={kind:'class',title:'Sweat440',detail:'Strength and conditioning. Adjust effort to how your legs feel.'};hard.add(k);n++;}}
  let sprint=false;if(sprints){for(const i of [1,2,0,3,4,6]){const k=keys[i];if(available(k)){assigned[k]={kind:'sprint',title:'Sprint session',detail:'Short, high-quality reps with full recovery. Stop before speed drops.'};hard.add(k);sprint=true;break;}}}
  const rows=keys.map((k,i)=>{const d=add(start,i),done=logged.get(k)||[];let row={key:k,date:d,day:DAYS[i],kind:'rest',title:'Recovery / flexibility',detail:'Optional easy walk or mobility. Keep hard training off this day.'};if(done.length){row={...row,kind:'done',title:'Already logged',detail:done.map(s=>s.type==='game'?'Basketball':s.type==='cross_training'?'Sweat440':s.type==='long_interval'?'Sprints':s.type==='lift'?'Strength':s.type==='walk'?'Walk':'Training').join(' · ')};}else if(assigned[k])row={...row,...assigned[k]};else if(d.getDay()===6)row={...row,title:'Shabbat',detail:'Rest day. No structured training.'};else if(before.has(k))row={...row,title:'Protect your legs',detail:'Keep this day easy before the game.'};else if(after.has(k))row={...row,title:'Recover',detail:'Easy movement only; let the game load settle.'};return row;});
  if(n<classes||(sprints&&!sprint))rows.push({key:'note',kind:'note',title:'A tight week',detail:'The plan fits '+n+' of '+classes+' classes'+(sprints?(sprint?' and your sprint session':', but not the sprint session'):'')+'. Reduce the target or turn sprints off rather than stacking hard days.'});
  return rows;
}

export function WeeklyGamePlanner({value,onChange,all=[]}) {
  const start=useMemo(()=>monday(new Date()),[]), weekId=keyOf(start), dates=Array.from({length:7},(_,i)=>add(start,i));
  const defaultGame=keyOf(add(start,3)), currentWeek=value?.weekId===weekId;
  const games=currentWeek&&Array.isArray(value?.gameDays)?value.gameDays:[defaultGame];
  const classes=currentWeek&&Number(value?.classTarget)?Number(value.classTarget):1, sprints=currentWeek?value?.wantsSprints!==false:true;
  const [updated,setUpdated]=useState(false);
  const change=patch=>{const next={weekId,gameDays:games,classTarget:classes,wantsSprints:sprints,...patch};const proposed=build(start,next.gameDays,next.classTarget,next.wantsSprints,all);next.classDates=proposed.filter(x=>x.kind==='class').map(x=>x.key);next.sprintDate=(next.wantsSprints?proposed.find(x=>x.kind==='sprint')?.key:null);onChange(next);setUpdated(true);};
  const plan=useMemo(()=>build(start,games,classes,sprints,all),[weekId,games.join(','),classes,sprints,all]);
  const pick=(active,color)=>({flex:1,minWidth:0,padding:'10px 3px',borderRadius:12,border:'1px solid '+(active?color:C.line),background:active?color+'18':C.raised,color:active?color:C.dim,fontFamily:'inherit',fontWeight:700,cursor:'pointer'});
  return <section className="engine-card" aria-label="Weekly game planner">
    <div className="engine-row"><span className="engine-label">THIS WEEK · {start.toLocaleDateString(undefined,{month:'short',day:'numeric'})}–{add(start,6).toLocaleDateString(undefined,{month:'short',day:'numeric'})}</span><span className="engine-muted">{updated?'Updated':'Adaptive plan'}</span></div>
    <h2>Build your game week</h2><p className="engine-muted">Tell us when you actually play. The plan protects the day before and after a game, respects Shabbat, and spaces out hard sessions.</p>
    <div className="engine-label" style={{marginTop:18,marginBottom:8}}>1. Which days do you have a game?</div><div style={{display:'flex',gap:5}}>{dates.map((d,i)=>{const k=keyOf(d),active=games.includes(k);return <button type="button" key={k} aria-pressed={active} onClick={()=>change({gameDays:active?games.filter(x=>x!==k):[...games,k].sort()})} style={pick(active,C.rust)}><div>{DAYS[i]}</div><div style={{fontSize:11,marginTop:4}}>{d.getDate()}</div></button>;})}</div>
    <div className="engine-row" style={{marginTop:8}}><span className="engine-muted">{games.length?games.length+' game'+(games.length===1?'':'s')+' planned':'No games this week'}</span><button type="button" className="engine-link" onClick={()=>change({gameDays:[],classTarget:Math.max(classes,2)})}>No games this week</button></div>
    <div className="engine-label" style={{marginTop:18,marginBottom:8}}>2. Sweat440 classes per week</div><div style={{display:'flex',gap:8}}>{[1,2,3].map(n=><button type="button" key={n} aria-pressed={classes===n} onClick={()=>change({classTarget:n})} style={pick(classes===n,C.pink)}><div style={{fontSize:18}}>{n}</div><div style={{fontSize:10,fontWeight:500}}>classes</div></button>)}</div>
    <div className="engine-row" style={{marginTop:18}}><div><div className="engine-label">3. Sprint training</div><p className="engine-muted" style={{margin:'4px 0 0'}}>One focused session with full recovery between reps.</p></div><button type="button" className="engine-button" aria-pressed={sprints} onClick={()=>change({wantsSprints:!sprints})}>{sprints?'Included':'Off this week'}</button></div>
    <div className="engine-row" style={{marginTop:22}}><span className="engine-label">Your recommended plan</span><span className="engine-muted">{plan.filter(x=>['game','class','sprint'].includes(x.kind)).length} hard sessions</span></div>
    {plan.filter(x=>x.kind!=='note').map(day=><div key={day.key} style={{display:'flex',gap:12,padding:'13px 0',borderBottom:'1px solid '+C.line,alignItems:'flex-start'}}><div style={{width:42,flexShrink:0}}><div className="engine-label">{day.day}</div><div style={{fontSize:22,fontWeight:700}}>{day.date.getDate()}</div></div><div style={{width:5,alignSelf:'stretch',minHeight:38,borderRadius:8,background:day.kind==='game'?C.rust:day.kind==='class'?C.pink:day.kind==='sprint'?C.electric:day.kind==='done'?C.moss:C.line}}/><div style={{flex:1}}><div style={{fontWeight:700,fontSize:14}}>{day.title}</div><p className="engine-muted" style={{margin:'4px 0 0',lineHeight:1.45}}>{day.detail}</p></div></div>)}
    {plan.filter(x=>x.kind==='note').map(x=><div key={x.key} role="status" style={{marginTop:12,padding:12,borderRadius:12,background:C.raised}}><strong>{x.title}</strong><p className="engine-muted" style={{margin:'5px 0 0'}}>{x.detail}</p></div>)}
    <p className="engine-muted" style={{marginTop:12}}>This is a suggested schedule, not a readiness diagnosis. If you feel unusually fatigued, sore, or ill, replace hard training with rest.</p>
  </section>;
}