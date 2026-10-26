import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { todayKarachi, hhmmDuration, fmtMinutes } from '../lib/date';
import { Card, Field, Err, Ok, errText, PageHead, Toggle, Empty } from '../components/ui';
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
    setOk('Sleep saved.'); setWakeTime(''); setNotes(''); load();
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
    <div className="page-narrow">
      <PageHead title="Sleep" tagline="Two steps: log when you slept, then add your wake time when you get up. The duration only counts once you've woken up — and it handles crossing midnight for you." />
      <Err msg={err} /><Ok msg={ok} />
      <Card title="Log sleep">
        <form onSubmit={add} className="form-stack">
          <Field label="Night of (bed date)"><input type="date" required value={bedDate} onChange={(e) => setBedDate(e.target.value)} /></Field>
          <Field label="Bedtime"><input type="time" required value={bedtime} onChange={(e) => setBedtime(e.target.value)} /></Field>
          <Field label="Wake time (leave empty until you wake up)"><input type="time" value={wakeTime} onChange={(e) => setWakeTime(e.target.value)} /></Field>
          <Field label="Notes (optional)"><input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="How was the night?" /></Field>
          <Toggle label="This was a nap" on={isNap} onToggle={() => setIsNap(!isNap)} />
          <button className="btn block" type="submit">Save sleep</button>
        </form>
      </Card>
      <Card title="Recent nights">
        {rows.length === 0 ? <Empty text="No sleep logged yet. Log last night to start the record." /> : rows.map((r) => {
          const dur = hhmmDuration(r.bedtime, r.wake_time);
          return (
            <div className="hrow" key={r.id}>
              <div className="hrow-main"><b>{r.bed_date}</b>{r.is_nap ? ' · nap' : ''} · bed {r.bedtime}{r.wake_time ? ` → wake ${r.wake_time}` : ''}</div>
              <div className="hrow-meta">{r.wake_time ? `Slept ${fmtMinutes(dur)}` : 'Wake time not logged yet — duration is waiting on it.'}{r.notes ? ` · ${r.notes}` : ''}</div>
              <div className="hrow-actions">
                <Field label="Set wake time"><input type="time" defaultValue={r.wake_time ?? ''} onBlur={(e) => { if (e.target.value !== (r.wake_time ?? '')) setWake(r.id, e.target.value); }} /></Field>
                <button className="txt-danger" onClick={() => del(r.id)}>Delete</button>
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
