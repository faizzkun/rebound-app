import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { todayKarachi } from '../lib/date';
import { PRAYERS } from '../lib/score';
import { Card, Field, Err, Ok, errText } from '../components/ui';
import type { PrayerLog, QazaRow } from '../lib/types';

export default function PrayerQaza({ userId }: { userId: string }) {
  const today = todayKarachi();
  const [date, setDate] = useState(today);
  const [logs, setLogs] = useState<PrayerLog[]>([]);
  const [qaza, setQaza] = useState<QazaRow[]>([]);
  const [history, setHistory] = useState<{ id: string; ledger_id: string; delta: number; reason: string }[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [prayer, setPrayer] = useState('fajr');
  const [qty, setQty] = useState(1);
  const [fulfillQty, setFulfillQty] = useState(1);

  async function load() {
    const [l, q, h] = await Promise.all([
      supabase.from('prayer_logs').select('*').eq('owner_id', userId).eq('prayer_date', date).order('prayer'),
      supabase.from('qaza_ledger').select('*').eq('owner_id', userId).order('recorded_date', { ascending: false }),
      supabase.from('qaza_ledger_history').select('*').eq('owner_id', userId).order('created_at', { ascending: false }).limit(50),
    ]);
    const e = l.error || q.error || h.error;
    if (e) { setErr(errText(e)); return; }
    setLogs(l.data as PrayerLog[]); setQaza(q.data as QazaRow[]); setHistory(h.data as typeof history);
  }
  useEffect(() => { load(); }, [date]); // eslint-disable-line react-hooks/exhaustive-deps

  async function savePrayer(p: string, patch: Partial<PrayerLog>) {
    const { error } = await supabase.from('prayer_logs').upsert(
      { owner_id: userId, prayer_date: date, prayer: p, performed: false, ...patch },
      { onConflict: 'owner_id,prayer_date,prayer' },
    );
    if (error) setErr(errText(error)); else load();
  }

  async function addQaza(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setOk(null);
    const { data, error } = await supabase.from('qaza_ledger').insert({ owner_id: userId, prayer, outstanding_qty: qty, recorded_date: date, status: 'open' }).select().single();
    if (error) { setErr(errText(error)); return; }
    await supabase.from('qaza_ledger_history').insert({ ledger_id: data.id, owner_id: userId, delta: qty, reason: `Recorded ${qty} outstanding ${prayer} qaza` });
    setOk('Qaza recorded.'); load();
  }

  async function fulfill(row: QazaRow) {
    const take = Math.min(fulfillQty, row.outstanding_qty);
    const remaining = row.outstanding_qty - take;
    const { error } = await supabase.from('qaza_ledger').update({
      outstanding_qty: remaining, status: remaining === 0 ? 'fulfilled' : 'open',
      fulfilled_date: remaining === 0 ? date : null,
    }).eq('id', row.id);
    if (error) { setErr(errText(error)); return; }
    await supabase.from('qaza_ledger_history').insert({ ledger_id: row.id, owner_id: userId, delta: -take, reason: `Fulfilled ${take} ${row.prayer} qaza` });
    setOk(`Fulfilled ${take}. ${remaining} remaining on that entry.`); load();
  }

  const outstanding = qaza.filter((q) => q.status === 'open').reduce((s, q) => s + q.outstanding_qty, 0);

  return (
    <div>
      <Err msg={err} /><Ok msg={ok} />
      <Card title="Prayer" sub="One row per prayer per day. Qaza is recorded separately in the ledger below — a missed prayer is a debt to clear, not a mark against you.">
        <Field label="Date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        {PRAYERS.map((p) => {
          const row = logs.find((l) => l.prayer === p);
          return (
            <div key={p} className="row" style={{ borderTop: '1px solid #2a2a2a', padding: '10px 0' }}>
              <span style={{ textTransform: 'capitalize', minWidth: 80 }}>{p}</span>
              <label className="row"><input type="checkbox" checked={Boolean(row?.performed)} onChange={(e) => savePrayer(p, { performed: e.target.checked, performed_at: e.target.checked ? new Date().toISOString() : null })} /> Performed</label>
              <label className="row"><input type="checkbox" checked={Boolean(row?.with_jamaat)} onChange={(e) => savePrayer(p, { with_jamaat: e.target.checked })} /> Jamaat</label>
              <label className="row"><input type="checkbox" checked={Boolean(row?.is_late)} onChange={(e) => savePrayer(p, { is_late: e.target.checked })} /> Late</label>
              <label className="row"><input type="checkbox" checked={Boolean(row?.is_qaza)} onChange={(e) => savePrayer(p, { is_qaza: e.target.checked })} /> Qaza</label>
            </div>
          );
        })}
      </Card>
      <Card title="Qaza ledger" sub={`Total outstanding (open entries): ${outstanding}`}>
        <form onSubmit={addQaza} className="grid">
          <Field label="Prayer"><select value={prayer} onChange={(e) => setPrayer(e.target.value)}>{PRAYERS.map((p) => <option key={p} value={p}>{p}</option>)}</select></Field>
          <Field label="Outstanding qty"><input type="number" min={1} value={qty} onChange={(e) => setQty(Number(e.target.value))} /></Field>
          <div style={{ alignSelf: 'end' }}><button className="btn" type="submit">Add outstanding qaza</button></div>
        </form>
        <Field label="Fulfill qty (per click)"><input type="number" min={1} value={fulfillQty} onChange={(e) => setFulfillQty(Number(e.target.value))} /></Field>
        <ul className="list">
          {qaza.map((q) => (
            <li key={q.id}><span>{q.prayer} · {q.recorded_date} · <b>{q.outstanding_qty} outstanding</b> · {q.status}{q.fulfilled_date ? ` · fulfilled ${q.fulfilled_date}` : ''}</span>
              {q.status === 'open' ? <button className="btn small" onClick={() => fulfill(q)}>Mark fulfilled</button> : null}</li>
          ))}
          {qaza.length === 0 ? <li className="muted">No qaza entries yet.</li> : null}
        </ul>
        <h3>Ledger history (audit trail — every change is recorded)</h3>
        <ul className="list">{history.map((h) => <li key={h.id}><span>{h.delta > 0 ? '+' : ''}{h.delta} — {h.reason}</span></li>)}</ul>
      </Card>
    </div>
  );
}
