import React, { useState } from 'react';
import { calcProteinTarget, calcCalorieTarget, GOAL_MODES, todayKey } from './model';
import { toast } from './ui';

const blank = () => ({ name:'', protein:'', calories:'', portions:'1', day:todayKey() });
const recipeKey = e => `${e.name.trim().toLowerCase()}|${e.protein}|${e.calories}`;
export const newFoodId = () => window.crypto?.randomUUID ? window.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function FoodJournal({ entries, favorites, onEntry, onFavorite, proteinLog, calorieLog, bodyStats, children }) {
  const [form,setForm] = useState(null);
  const [error,setError] = useState('');
  const [day,setDay] = useState(todayKey());
  const rows = Object.entries(entries).filter(([,e])=>e).map(([id,e])=>({...e,id})).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));
  const todayEntries = rows.filter(e=>e.day===day);
  const recipes = Object.entries(favorites).filter(([,e])=>e).map(([id,e])=>({...e,id}));
  const recent = rows.filter((e,i,arr)=>arr.findIndex(r=>recipeKey(r)===recipeKey(e))===i).slice(0,5);
  const pTarget=calcProteinTarget(bodyStats.weightLbs);
  const mode=GOAL_MODES[bodyStats.goal] || GOAL_MODES.lean;
  const cTarget=calcCalorieTarget(bodyStats.weightLbs,bodyStats.heightInches,bodyStats.age,bodyStats.activityFactor||1.55,mode.delta);
  const protein=Number(proteinLog[day])||0, calories=Number(calorieLog[day])||0;
  const start = value => {setForm({...blank(),day,...value});setError('');};
  const quick = e => {
    const id=newFoodId();onEntry(id,{name:e.name,protein:Number(e.protein)||0,calories:Number(e.calories)||0,portions:1,day,createdAt:new Date().toISOString()});
    toast(`${e.name} added`,{actionLabel:'UNDO',onAction:()=>onEntry(id,null)});
  };
  const recipeRow = (e,favorite) => <div className="engine-row engine-wrap" key={e.id} style={{borderBottom:'1px solid var(--line)',padding:'10px 0'}}>
    <div style={{flex:'1 1 160px'}}><strong>{e.name}</strong><div className="engine-muted">{e.protein}g protein · {e.calories} cal per serving</div></div>
    <div className="engine-actions" style={{margin:0}}><button className="engine-button" aria-label={`Add ${e.name}`} onClick={()=>quick(e)}>+ Add</button><button className="engine-link" onClick={()=>start({name:e.name,protein:e.protein,calories:e.calories})}>Adjust</button>{favorite && <button className="engine-link" aria-label={`Remove favorite ${e.name}`} onClick={()=>onFavorite(e.id,null)}>Remove</button>}</div>
  </div>;
  return <>
    <section className="engine-card"><span className="engine-label">Fuel your Engine</span><h1 style={{fontSize:32}}>Food, made simple</h1>
      <label className="engine-field">Log date<input type="date" aria-label="Food log date" value={day} max={todayKey()} onChange={e=>{if(e.target.value)setDay(e.target.value);}}/></label>
      <div className="engine-grid"><div className="engine-mini"><span className="engine-label">Protein</span><strong>{Math.round(protein)}g</strong><span className="engine-muted">{pTarget}g target · {Math.max(0,Math.round(pTarget-protein))}g remaining</span></div><div className="engine-mini"><span className="engine-label">Calories</span><strong>{Math.round(calories).toLocaleString()}</strong><span className="engine-muted">{cTarget.toLocaleString()} target · {Math.round(Math.abs(cTarget-calories))} {calories>cTarget?'above':'remaining'}</span></div></div>
      <div className="engine-actions"><button className="engine-button primary" onClick={()=>start({})}>Add food</button><button className="engine-button" onClick={()=>quick({name:'Protein quick add',protein:20,calories:0})}>+20g protein</button></div>
      <p className="engine-muted">Protein-only entries leave calories unchanged. Add calories when you know them.</p>
    </section>
    {form && <section className="engine-card" aria-label="Food entry"><h2>{form.id?'Edit food':'Add food'}</h2><form onSubmit={e=>{
      e.preventDefault();const protein=Number(form.protein),calories=Number(form.calories),portions=Number(form.portions);
      if(!form.name.trim()||!Number.isFinite(protein)||!Number.isFinite(calories)||!Number.isFinite(portions)||protein<0||calories<0||portions<=0||protein>1000||calories>20000||portions>100||(protein===0&&calories===0)||!/^\d{4}-\d{2}-\d{2}$/.test(form.day)||form.day>todayKey()){setError('Add a name, a valid date, positive portions, and a protein or calorie amount.');return;}
      const id=form.id||newFoodId();const value={name:form.name.trim(),protein,calories,portions,day:form.day,createdAt:form.createdAt||new Date().toISOString()};
      const previous=entries[id]||null;onEntry(id,value);setForm(null);setDay(form.day);toast('Food saved',{actionLabel:'UNDO',onAction:()=>onEntry(id,previous)});
    }}>
      <label className="engine-field">Food or meal name<input value={form.name} required maxLength={100} onChange={e=>setForm({...form,name:e.target.value})}/></label>
      <div className="engine-grid"><label className="engine-field">Protein per serving (g)<input type="number" min="0" max="1000" step="0.1" value={form.protein} onChange={e=>setForm({...form,protein:e.target.value})}/></label><label className="engine-field">Calories per serving<input type="number" min="0" max="20000" step="1" value={form.calories} onChange={e=>setForm({...form,calories:e.target.value})}/></label></div>
      <div className="engine-grid"><label className="engine-field">Servings<input type="number" min="0.1" max="100" step="0.1" value={form.portions} required onChange={e=>setForm({...form,portions:e.target.value})}/></label><label className="engine-field">Date<input type="date" value={form.day} max={todayKey()} required onChange={e=>setForm({...form,day:e.target.value})}/></label></div>
      {error && <p role="alert">{error}</p>}<div className="engine-actions"><button className="engine-button primary" type="submit">Save food</button><button className="engine-button" type="button" onClick={()=>setForm(null)}>Cancel</button></div>
    </form></section>}
    <section className="engine-card"><span className="engine-label">Your usuals</span><h2>Favorites</h2>{recipes.length ? recipes.map(e=>recipeRow(e,true)) : <p className="engine-muted">Save a logged meal as a favorite to add it again in one tap.</p>}</section>
    {recent.length>0 && <section className="engine-card"><h2>Recent meals</h2><p className="engine-muted">Repeat a serving, or adjust the portions first.</p>{recent.map(e=>recipeRow(e,false))}</section>}
    <section className="engine-card"><h2>{day===todayKey()?'Today’s entries':`${day} entries`}</h2>{!todayEntries.length && <p className="engine-muted">No individual food entries for this date.</p>}
      {todayEntries.map(e=><div key={e.id} style={{borderBottom:'1px solid var(--line)',padding:'12px 0'}}><strong>{e.name}</strong><p className="engine-muted">{e.portions} {Number(e.portions)===1?'serving':'servings'} · {Math.round(e.protein*e.portions)}g protein · {Math.round(e.calories*e.portions)} cal</p><div className="engine-actions"><button className="engine-button" onClick={()=>start(e)}>Edit</button><button className="engine-button" disabled={recipes.some(r=>recipeKey(r)===recipeKey(e))} onClick={()=>onFavorite(newFoodId(),{name:e.name,protein:e.protein,calories:e.calories})}>{recipes.some(r=>recipeKey(r)===recipeKey(e))?'Favorited':'Save favorite'}</button><button className="engine-link" onClick={()=>{onEntry(e.id,null);toast('Food removed',{actionLabel:'UNDO',onAction:()=>onEntry(e.id,entries[e.id])});}}>Delete</button></div></div>)}
      <p className="engine-muted">Previously saved daily totals are included above. Individual entries begin with this food journal.</p>
    </section>
    <details className="engine-card"><summary style={{minHeight:44,paddingTop:10,cursor:'pointer',fontWeight:600}}>Food guide, targets & supplements</summary><div style={{marginTop:16}}>{children}</div></details>
  </>;
}
