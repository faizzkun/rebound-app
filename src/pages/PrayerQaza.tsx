import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { todayKarachi } from '../lib/date';
import { PRAYERS } from '../lib/score';
import { Card, Field, Err, Ok, errText, PageHead, Toggle, Chip, Details, Empty } from '../components/ui';
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
  const doneCount = logs.filter((l) => l.performed).length;

  return (
    <div className="page-narrow">
      <PageHead title="Prayer" tagline="Tap a prayer on when you've prayed it. The small chips underneath say how it went. A missed prayer isn't a failure — it goes in the ledger below as a debt you clear, one at a time." />
      <Err msg={err} /><Ok msg={ok} />
      <Card title={`Today's prayers · ${doneCount}/5 done`}>
        <Field label="Date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        {PRAYERS.map((p) => {
          const row = logs.find((l) => l.prayer === p);
          return (
            <div key={p} className="prayer-block">
              <Toggle label={p} hint={row?.is_qaza ? 'Marked as qaza' : row?.with_jamaat ? 'With Jamaat' : undefined}
                on={Boolean(row?.performed)}
                onToggle={() => savePrayer(p, { performed: !row?.performed, performed_at: !row?.performed ? new Date().toISOString() : null })} />
              <div className="chip-row">
                <Chip label="Jamaat" on={Boolean(row?.with_jamaat)} onToggle={() => savePrayer(p, { with_jamaat: !row?.with_jamaat })} />
                <Chip label="Late" on={Boolean(row?.is_late)} onToggle={() => savePrayer(p, { is_late: !row?.is_late })} />
                <Chip label="Qaza" on={Boolean(row?.is_qaza)} onToggle={() => savePrayer(p, { is_qaza: !row?.is_qaza })} />
              </div>
            </div>
          );
        })}
      </Card>
      <Card title="Qaza ledger" sub={`${outstanding} outstanding right now. Add what you owe, then clear it bit by bit.`}>
        <form onSubmit={addQaza} className="form-stack">
          <Field label="Which prayer?"><select value={prayer} onChange={(e) => setPrayer(e.target.value)}>{PRAYERS.map((p) => <option key={p} value={p}>{p}</option>)}</select></Field>
          <Field label="How many are outstanding?"><input type="number" min={1} value={qty} onChange={(e) => setQty(Number(e.target.value))} /></Field>
          <button className="btn block" type="submit">Add to ledger</button>
        </form>
        <Field label="Clear this many per tap"><input type="number" min={1} value={fulfillQty} onChange={(e) => setFulfillQty(Number(e.target.value))} /></Field>
        {qaza.length === 0 ? <Empty text="No qaza entries. Clean slate." /> : qaza.map((q) => (
          <div className="hrow" key={q.id}>
            <div className="hrow-main"><b style={{ textTransform: 'capitalize' }}>{q.prayer}</b> · {q.recorded_date} · <b>{q.outstanding_qty} outstanding</b> · {q.status}{q.fulfilled_date ? ` · cleared ${q.fulfilled_date}` : ''}</div>
            {q.status === 'open' ? <div className="hrow-actions"><button className="btn small" onClick={() => fulfill(q)}>Clear {Math.min(fulfillQty, q.outstanding_qty)}</button></div> : null}
          </div>
        ))}
        <Details title="Ledger history — every change, kept as proof">
          {history.length === 0 ? <p className="muted">Nothing recorded yet.</p> : history.map((h) => (
            <div className="hrow" key={h.id}><div className="hrow-main">{h.delta > 0 ? '+' : ''}{h.delta} — {h.reason}</div></div>
          ))}
        </Details>
      </Card>
    </div>
  );
}
