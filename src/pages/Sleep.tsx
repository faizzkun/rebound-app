import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { todayKarachi, hhmmDuration, fmtMinutes } from '../lib/date';
import { Card, Field, Err, Ok, errText } from '../components/ui';
import type { SleepRow } from '../lib/types';

export default function Sleep({ userId }: { userId: string }) {
  const [rows, setRows] = useState<SleepRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [bedDate, setBedDate] = useState(todayKarachi());
  const [bedtime, setBedtime] = useState('23:00');
  const [wakeTime, setWakeTime] = useState('');
  const [isNap, setIsNap] = useState(false);
  const [notes, setNotes] = useState('');

  async function load() {
    const { data, error } = await supabase.from('sleep_sessions').select('*').eq('owner_id', userId).order('bed_date', { ascending: false }).limit(30);
    if (error) setErr(errText(error)); else setRows(data as SleepRow[]);
  }
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function add(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setOk(null);
    const { error } = await supabase.from('sleep_sessions').insert({ owner_id: userId, bed_date: bedDate, bedtime, wake_time: wakeTime || null, is_nap: isNap, notes: notes || null });
    if (error) { setErr(errText(error)); return; }
    setOk('Sleep session saved.'); setWakeTime(''); setNotes(''); load();
  }
  async function setWake(id: string, wake: string) {
    const { error } = await supabase.from('sleep_sessions').update({ wake_time: wake || null }).eq('id', id);
    if (error) setErr(errText(error)); else load();
  }
  async function del(id: string) {
    const { error } = await supabase.from('sleep_sessions').delete().eq('id', id);
    if (error) setErr(errText(error)); else load();
  }

  return (
    <div>
      <Err msg={err} /><Ok msg={ok} />
      <Card title="Sleep" sub="Bedtime is HH:MM. Duration is computed ONLY when a wake time exists — and it correctly crosses midnight (e.g. 23:30 → 07:00). No wake time yet means no finalized duration.">
        <form onSubmit={add} className="grid">
          <Field label="Bed date"><input type="date" required value={bedDate} onChange={(e) => setBedDate(e.target.value)} /></Field>
          <Field label="Bedtime (HH:MM)"><input type="time" required value={bedtime} onChange={(e) => setBedtime(e.target.value)} /></Field>
          <Field label="Wake time (optional, HH:MM)"><input type="time" value={wakeTime} onChange={(e) => setWakeTime(e.target.value)} /></Field>
          <Field label="Notes"><input value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
          <label className="row"><input type="checkbox" checked={isNap} onChange={(e) => setIsNap(e.target.checked)} /> Nap</label>
          <div style={{ alignSelf: 'end' }}><button className="btn" type="submit">Save sleep</button></div>
        </form>
      </Card>
      <Card title="Recent sleep">
        <ul className="list">
          {rows.map((r) => {
            const dur = hhmmDuration(r.bedtime, r.wake_time);
            return (
              <li key={r.id}>
                <span>{r.bed_date} · {r.is_nap ? 'nap · ' : ''}bed {r.bedtime}{r.wake_time ? ` → wake ${r.wake_time} · ${fmtMinutes(dur)}` : ' · wake not logged — duration pending'}</span>
                <span className="row">
                  <input type="time" style={{ width: 130 }} defaultValue={r.wake_time ?? ''} onBlur={(e) => { if (e.target.value !== (r.wake_time ?? '')) setWake(r.id, e.target.value); }} />
                  <button className="btn danger small" onClick={() => del(r.id)}>Delete</button>
                </span>
              </li>
            );
          })}
          {rows.length === 0 ? <li className="muted">No sleep logged yet.</li> : null}
        </ul>
      </Card>
    </div>
  );
}
