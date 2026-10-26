import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { todayKarachi } from '../lib/date';
import { Card, Field, Err, Ok, errText } from '../components/ui';
import type { SelfControlLog } from '../lib/types';

// Strictly private. Neutral, non-shaming language throughout.
// Nothing on this page is ever published, shared, or included in any
// public summary — by design, these categories have no public toggle.
export default function SelfControl({ userId }: { userId: string }) {
  const [rows, setRows] = useState<SelfControlLog[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [date, setDate] = useState(todayKarachi());
  const [category, setCategory] = useState('porn_exposure');
  const [occurred, setOccurred] = useState(false);
  const [context, setContext] = useState('');
  const [trigger, setTrigger] = useState('');
  const [reflection, setReflection] = useState('');

  async function load() {
    const { data, error } = await supabase.from('self_control_logs').select('*').eq('owner_id', userId).order('log_date', { ascending: false }).limit(60);
    if (error) setErr(errText(error)); else setRows(data as SelfControlLog[]);
  }
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function add(e: React.FormEvent) {
    e.preventDefault(); setErr(null);
    const { error } = await supabase.from('self_control_logs').insert({
      owner_id: userId, log_date: date, category, occurred,
      context: occurred ? context || null : null, trigger: occurred ? trigger || null : null,
      reflection: occurred ? reflection || null : null,
    });
    if (error) { setErr(errText(error)); return; }
    setContext(''); setTrigger(''); setReflection(''); setOccurred(false);
    setOk('Logged. This stays private — it is a data point for your own pattern, nothing more.'); load();
  }
  async function del(id: string) {
    const { error } = await supabase.from('self_control_logs').delete().eq('id', id);
    if (error) setErr(errText(error)); else load();
  }

  const label = (c: string) => c === 'porn_exposure' ? 'Porn exposure' : 'Masturbation';

  return (
    <div>
      <Err msg={err} /><Ok msg={ok} />
      <Card title="Private tracking" sub="Strictly private. No public toggle exists for this section, and nothing here appears on the public site, in public summaries, or in any shared data. Logged honestly, without judgement — patterns help you plan, not punish yourself.">
        <form onSubmit={add} className="grid">
          <Field label="Date"><input type="date" required value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Category"><select value={category} onChange={(e) => setCategory(e.target.value)}><option value="porn_exposure">Porn exposure</option><option value="masturbation">Masturbation</option></select></Field>
          <label className="row"><input type="checkbox" checked={occurred} onChange={(e) => setOccurred(e.target.checked)} /> It happened today</label>
          {occurred ? <>
            <Field label="Context (optional)"><input value={context} onChange={(e) => setContext(e.target.value)} /></Field>
            <Field label="Trigger (optional)"><input value={trigger} onChange={(e) => setTrigger(e.target.value)} /></Field>
            <Field label="Reflection (optional)"><textarea value={reflection} onChange={(e) => setReflection(e.target.value)} /></Field>
          </> : null}
          <div style={{ alignSelf: 'end' }}><button className="btn" type="submit">Save private log</button></div>
        </form>
        <p className="muted">A clean day and a logged day are both just data. What matters is the next choice — rebound, don't spiral.</p>
      </Card>
      <Card title="Recent private logs">
        <ul className="list">{rows.map((r) => (
          <li key={r.id}><span>{r.log_date} · {label(r.category)} · {r.occurred ? 'happened' : 'did not happen'}{r.trigger ? ` · trigger: ${r.trigger}` : ''}</span>
            <button className="btn danger small" onClick={() => del(r.id)}>Delete</button></li>
        ))}{rows.length === 0 ? <li className="muted">No logs yet.</li> : null}</ul>
      </Card>
    </div>
  );
}
