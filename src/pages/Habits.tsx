import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { todayKarachi } from '../lib/date';
import { Card, Field, Err, Ok, errText } from '../components/ui';
import type { HabitDef, HabitLog, GroomingLog, NutritionLog, UserPrefs } from '../lib/types';

export default function Habits({ userId }: { userId: string }) {
  const today = todayKarachi();
  const [defs, setDefs] = useState<HabitDef[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [grooming, setGrooming] = useState<GroomingLog[]>([]);
  const [nutrition, setNutrition] = useState<NutritionLog[]>([]);
  const [prefs, setPrefs] = useState<UserPrefs | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [slot, setSlot] = useState('any');
  const [junkDef, setJunkDef] = useState('');
  const [nKind, setNKind] = useState('junk');
  const [nDesc, setNDesc] = useState('');
  const [nAmount, setNAmount] = useState('');
  const [nReason, setNReason] = useState('');

  async function load() {
    const [d, l, g, n, p] = await Promise.all([
      supabase.from('habit_definitions').select('*').eq('owner_id', userId).order('name'),
      supabase.from('habit_logs').select('*').eq('owner_id', userId).eq('log_date', today),
      supabase.from('grooming_logs').select('*').eq('owner_id', userId).eq('log_date', today),
      supabase.from('nutrition_logs').select('*').eq('owner_id', userId).eq('log_date', today).order('created_at', { ascending: false }),
      supabase.from('user_preferences').select('*').eq('user_id', userId).maybeSingle(),
    ]);
    const e = d.error || l.error || g.error || n.error || p.error;
    if (e) { setErr(errText(e)); return; }
    setDefs(d.data as HabitDef[]); setLogs(l.data as HabitLog[]); setGrooming(g.data as GroomingLog[]);
    setNutrition(n.data as NutritionLog[]); setPrefs(p.data as UserPrefs | null);
    if (p.data) setJunkDef((p.data as UserPrefs).junk_food_definition ?? '');
  }
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function addHabit(e: React.FormEvent) {
    e.preventDefault(); setErr(null);
    const { error } = await supabase.from('habit_definitions').insert({ owner_id: userId, name, slot, target_per_day: 1, active: true });
    if (error) { setErr(errText(error)); return; }
    setName(''); setOk('Habit added.'); load();
  }
  async function toggleHabit(h: HabitDef) {
    const existing = logs.find((l) => l.habit_id === h.id);
    if (existing) {
      await supabase.from('habit_logs').update({ done: !existing.done }).eq('id', existing.id);
    } else {
      await supabase.from('habit_logs').insert({ owner_id: userId, habit_id: h.id, log_date: today, done: true });
    }
    load();
  }
  async function saveGrooming(s: string, patch: Partial<GroomingLog>) {
    const { error } = await supabase.from('grooming_logs').upsert(
      { owner_id: userId, log_date: today, slot: s, face_wash: false, teeth_brush: false, ...patch },
      { onConflict: 'owner_id,log_date,slot' },
    );
    if (error) setErr(errText(error)); else load();
  }
  async function saveJunkDef(e: React.FormEvent) {
    e.preventDefault(); setErr(null);
    const { error } = await supabase.from('user_preferences').upsert({ user_id: userId, junk_food_definition: junkDef || null }, { onConflict: 'user_id' });
    if (error) { setErr(errText(error)); return; }
    setOk('Junk-food definition saved. This is your definition — the app does not hardcode one.'); load();
  }
  async function addNutrition(e: React.FormEvent) {
    e.preventDefault(); setErr(null);
    const { error } = await supabase.from('nutrition_logs').insert({ owner_id: userId, log_date: today, kind: nKind, description: nDesc || null, amount_spent: nAmount ? Number(nAmount) : null, reason: nReason || null });
    if (error) { setErr(errText(error)); return; }
    setNDesc(''); setNAmount(''); setNReason(''); setOk('Nutrition entry saved.'); load();
  }

  return (
    <div>
      <Err msg={err} /><Ok msg={ok} />
      <Card title="Habits — today" sub="Custom habits, plus morning/evening grooming. Add a definition once, then tick it daily.">
        <form onSubmit={addHabit} className="grid">
          <Field label="Habit name"><input required value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Slot"><select value={slot} onChange={(e) => setSlot(e.target.value)}><option value="any">any</option><option value="morning">morning</option><option value="evening">evening</option></select></Field>
          <div style={{ alignSelf: 'end' }}><button className="btn" type="submit">Add habit</button></div>
        </form>
        {defs.filter((d) => d.active).map((h) => (
          <label className="check" key={h.id}>
            <input type="checkbox" checked={Boolean(logs.find((l) => l.habit_id === h.id)?.done)} onChange={() => toggleHabit(h)} />
            <span>{h.name} <span className="pill">{h.slot}</span></span>
            <button className="btn ghost small" onClick={async () => { await supabase.from('habit_definitions').update({ active: false }).eq('id', h.id); load(); }}>Deactivate</button>
          </label>
        ))}
        {defs.filter((d) => d.active).length === 0 ? <p className="muted">No active habits yet — add your first one above.</p> : null}
      </Card>
      <Card title="Grooming — today">
        {(['morning', 'evening'] as const).map((s) => {
          const row = grooming.find((g) => g.slot === s);
          return (
            <div key={s} className="row" style={{ borderTop: '1px solid #2a2a2a', padding: '10px 0' }}>
              <span style={{ textTransform: 'capitalize', minWidth: 90 }}>{s}</span>
              <label className="row"><input type="checkbox" checked={Boolean(row?.face_wash)} onChange={(e) => saveGrooming(s, { face_wash: e.target.checked })} /> Face wash</label>
              <label className="row"><input type="checkbox" checked={Boolean(row?.teeth_brush)} onChange={(e) => saveGrooming(s, { teeth_brush: e.target.checked })} /> Teeth brush</label>
            </div>
          );
        })}
      </Card>
      <Card title="Nutrition — today" sub="Junk is whatever YOU define as junk. Set the definition below, then log honestly — outside food and other entries included.">
        <form onSubmit={saveJunkDef} className="grid">
          <Field label="My junk-food definition (configurable)"><input value={junkDef} onChange={(e) => setJunkDef(e.target.value)} placeholder="e.g. fried fast food, sugary drinks…" /></Field>
          <div style={{ alignSelf: 'end' }}><button className="btn ghost" type="submit">Save definition</button></div>
        </form>
        <p className="muted">Current definition: {prefs?.junk_food_definition ?? 'not set yet'}</p>
        <form onSubmit={addNutrition} className="grid">
          <Field label="Kind"><select value={nKind} onChange={(e) => setNKind(e.target.value)}><option value="junk">junk</option><option value="outside">outside</option><option value="other">other</option></select></Field>
          <Field label="What"><input value={nDesc} onChange={(e) => setNDesc(e.target.value)} /></Field>
          <Field label="Amount spent (PKR)"><input type="number" step="0.01" value={nAmount} onChange={(e) => setNAmount(e.target.value)} /></Field>
          <Field label="Reason"><input value={nReason} onChange={(e) => setNReason(e.target.value)} /></Field>
          <div style={{ alignSelf: 'end' }}><button className="btn" type="submit">Log food</button></div>
        </form>
        <ul className="list">{nutrition.map((n) => (
          <li key={n.id}><span>{n.kind} · {n.description ?? '(no detail)'}{n.amount_spent ? ` · PKR ${n.amount_spent}` : ''}{n.reason ? ` · ${n.reason}` : ''}</span></li>
        ))}{nutrition.length === 0 ? <li className="muted">Nothing logged today.</li> : null}</ul>
      </Card>
    </div>
  );
}
