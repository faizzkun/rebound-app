import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { todayKarachi } from '../lib/date';
import { Card, Field, Err, Ok, errText, PageHead, Toggle, Seg, Details, Empty } from '../components/ui';
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
    setOk('Junk definition saved. This is your definition — the app does not hardcode one.'); load();
  }
  async function addNutrition(e: React.FormEvent) {
    e.preventDefault(); setErr(null);
    const { error } = await supabase.from('nutrition_logs').insert({ owner_id: userId, log_date: today, kind: nKind, description: nDesc || null, amount_spent: nAmount ? Number(nAmount) : null, reason: nReason || null });
    if (error) { setErr(errText(error)); return; }
    setNDesc(''); setNAmount(''); setNReason(''); setOk('Food logged.'); load();
  }

  const active = defs.filter((d) => d.active);
  const doneCount = active.filter((h) => logs.find((l) => l.habit_id === h.id)?.done).length;

  return (
    <div className="page-narrow">
      <PageHead title="Habits & Food" tagline="Your daily checklist, minus the checklist feeling. Tap a card — it lights up. That's the whole interaction. Food logging is honest tracking, not a diet lecture." />
      <Err msg={err} /><Ok msg={ok} />
      <Card title={`Today's habits · ${doneCount}/${active.length} done`}>
        <form onSubmit={addHabit} className="form-stack">
          <Field label="New habit"><input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Read 20 pages, Walk 30 min…" /></Field>
          <Seg label="When?" value={slot} onChange={setSlot} options={[
            { value: 'any', label: 'Any time' }, { value: 'morning', label: 'Morning' }, { value: 'evening', label: 'Evening' },
          ]} />
          <button className="btn block" type="submit">Add habit</button>
        </form>
        {active.length === 0 ? <Empty text="No active habits yet — add your first one above." /> : active.map((h) => (
          <div key={h.id}>
            <Toggle label={h.name} hint={h.slot && h.slot !== 'any' ? h.slot : undefined}
              on={Boolean(logs.find((l) => l.habit_id === h.id)?.done)} onToggle={() => toggleHabit(h)} />
            <div style={{ textAlign: 'right', margin: '-4px 0 10px' }}>
              <button className="txt-quiet" onClick={async () => { await supabase.from('habit_definitions').update({ active: false }).eq('id', h.id); load(); }}>Stop tracking this habit</button>
            </div>
          </div>
        ))}
      </Card>
      <Card title="Grooming — morning & evening">
        {(['morning', 'evening'] as const).map((s) => {
          const row = grooming.find((g) => g.slot === s);
          return (
            <div key={s} style={{ marginBottom: 6 }}>
              <h3 style={{ textTransform: 'capitalize', margin: '10px 0 10px' }}>{s}</h3>
              <Toggle label="Face wash" on={Boolean(row?.face_wash)} onToggle={() => saveGrooming(s, { face_wash: !row?.face_wash })} />
              <Toggle label="Teeth brush" on={Boolean(row?.teeth_brush)} onToggle={() => saveGrooming(s, { teeth_brush: !row?.teeth_brush })} />
            </div>
          );
        })}
      </Card>
      <Card title="Food today">
        <div className="notebox">Junk is whatever <b>you</b> define as junk. {prefs?.junk_food_definition ? <>Your current definition: <b>{prefs.junk_food_definition}</b></> : 'You haven\'t set a definition yet — the one below is yours to write.'}</div>
        <form onSubmit={addNutrition} className="form-stack">
          <Seg label="What kind?" value={nKind} onChange={setNKind} options={[
            { value: 'junk', label: 'Junk' }, { value: 'outside', label: 'Outside food' }, { value: 'other', label: 'Other' },
          ]} />
          <Field label="What was it?"><input value={nDesc} onChange={(e) => setNDesc(e.target.value)} placeholder="e.g. Burger, chai…" /></Field>
          <Field label="Amount spent (PKR, optional)"><input type="number" step="0.01" value={nAmount} onChange={(e) => setNAmount(e.target.value)} /></Field>
          <Field label="Reason (optional)"><input value={nReason} onChange={(e) => setNReason(e.target.value)} placeholder="Craving? Guests? Late night?" /></Field>
          <button className="btn block" type="submit">Log food</button>
        </form>
        {nutrition.length === 0 ? <Empty text="Nothing logged today." /> : nutrition.map((n) => (
          <div className="hrow" key={n.id}>
            <div className="hrow-main"><b style={{ textTransform: 'capitalize' }}>{n.kind}</b> · {n.description ?? '(no detail)'}</div>
            <div className="hrow-meta">{n.amount_spent ? `PKR ${n.amount_spent} · ` : ''}{n.reason ?? ''}</div>
          </div>
        ))}
        <Details title="Change my junk-food definition">
          <form onSubmit={saveJunkDef} className="form-stack">
            <Field label="My junk-food definition"><input value={junkDef} onChange={(e) => setJunkDef(e.target.value)} placeholder="e.g. fried fast food, sugary drinks…" /></Field>
            <button className="btn ghost block" type="submit">Save definition</button>
          </form>
        </Details>
      </Card>
    </div>
  );
}
