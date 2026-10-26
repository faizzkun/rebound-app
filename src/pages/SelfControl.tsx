import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { todayKarachi } from '../lib/date';
import { Card, Field, Err, Ok, errText, PageHead, Toggle, Seg, Empty } from '../components/ui';
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
    <div className="page-narrow">
      <PageHead title="Private tracking" tagline="This page is locked to you alone. There is no public switch for it, and nothing here ever appears on the public site. Log honestly, without judgement — patterns help you plan, not punish yourself." />
      <Err msg={err} /><Ok msg={ok} />
      <div className="notebox">A clean day and a logged day are both just data. What matters is the next choice — <b>rebound, don't spiral.</b></div>
      <Card title="Log today">
        <form onSubmit={add} className="form-stack">
          <Field label="Date"><input type="date" required value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Seg label="Category" value={category} onChange={setCategory} options={[
            { value: 'porn_exposure', label: 'Porn exposure' }, { value: 'masturbation', label: 'Masturbation' },
          ]} />
          <Toggle label="It happened" hint="Leave off for a clean day" on={occurred} onToggle={() => setOccurred(!occurred)} />
          {occurred ? <>
            <Field label="Context (optional)"><input value={context} onChange={(e) => setContext(e.target.value)} placeholder="Where / when?" /></Field>
            <Field label="Trigger (optional)"><input value={trigger} onChange={(e) => setTrigger(e.target.value)} placeholder="What led to it?" /></Field>
            <Field label="Reflection (optional)"><textarea value={reflection} onChange={(e) => setReflection(e.target.value)} placeholder="What will you do differently next time?" /></Field>
          </> : null}
          <button className="btn block" type="submit">Save private log</button>
        </form>
      </Card>
      <Card title="Recent logs">
        {rows.length === 0 ? <Empty text="No logs yet." /> : rows.map((r) => (
          <div className="hrow" key={r.id}>
            <div className="hrow-main"><b>{r.log_date}</b> · {label(r.category)} · {r.occurred ? 'happened' : 'did not happen'}</div>
            {r.trigger ? <div className="hrow-meta">Trigger: {r.trigger}</div> : null}
            <div className="hrow-actions"><button className="txt-danger" onClick={() => del(r.id)}>Delete</button></div>
          </div>
        ))}
      </Card>
    </div>
  );
}
