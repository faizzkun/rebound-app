import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { todayKarachi } from '../lib/date';
import { Card, Field, Err, Ok, errText, PageHead, Seg, Empty } from '../components/ui';
import type { JournalEntry, LifeEvent } from '../lib/types';

export default function Journal({ userId }: { userId: string }) {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [events, setEvents] = useState<LifeEvent[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [date, setDate] = useState(todayKarachi());
  const [body, setBody] = useState('');
  const [wentWell, setWentWell] = useState('');
  const [wentWrong, setWentWrong] = useState('');
  const [learned, setLearned] = useState('');
  const [improve, setImprove] = useState('');
  const [mood, setMood] = useState('');
  const [energy, setEnergy] = useState('');
  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState(todayKarachi());
  const [destination, setDestination] = useState('');
  const [activities, setActivities] = useState('');
  const [outcomes, setOutcomes] = useState('');
  const [money, setMoney] = useState('');
  const [importance, setImportance] = useState('');

  async function load() {
    const [j, l] = await Promise.all([
      supabase.from('journal_entries').select('*').eq('owner_id', userId).order('entry_date', { ascending: false }).limit(30),
      supabase.from('life_events').select('*').eq('owner_id', userId).order('event_date', { ascending: false }).limit(30),
    ]);
    if (j.error || l.error) { setErr(errText(j.error || l.error)); return; }
    setEntries(j.data as JournalEntry[]); setEvents(l.data as LifeEvent[]);
  }
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function addJournal(e: React.FormEvent) {
    e.preventDefault(); setErr(null);
    const { error } = await supabase.from('journal_entries').insert({
      owner_id: userId, entry_date: date, body: body || null, went_well: wentWell || null,
      went_wrong: wentWrong || null, learned: learned || null, improve_tomorrow: improve || null,
      mood: mood ? Number(mood) : null, energy: energy ? Number(energy) : null,
    });
    if (error) { setErr(errText(error)); return; }
    setBody(''); setWentWell(''); setWentWrong(''); setLearned(''); setImprove(''); setOk('Journal entry saved. Private by default.'); load();
  }
  async function addEvent(e: React.FormEvent) {
    e.preventDefault(); setErr(null);
    const { error } = await supabase.from('life_events').insert({
      owner_id: userId, title, event_date: eventDate, destination: destination || null,
      activities: activities || null, outcomes: outcomes || null,
      money_spent: money ? Number(money) : null, importance: importance ? Number(importance) : null,
      is_public: false,
    });
    if (error) { setErr(errText(error)); return; }
    setTitle(''); setDestination(''); setActivities(''); setOutcomes(''); setMoney(''); setOk('Life event saved. Private unless you explicitly opt it in later.'); load();
  }
  async function del(table: string, id: string) {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) setErr(errText(error)); else load();
  }

  const scale = (label: string, value: string, onChange: (v: string) => void) => (
    <Seg label={label} value={value} onChange={onChange} options={[
      { value: '1', label: '1 · Low' }, { value: '2', label: '2' }, { value: '3', label: '3 · OK' },
      { value: '4', label: '4' }, { value: '5', label: '5 · High' },
    ]} />
  );

  return (
    <div className="page-narrow">
      <PageHead title="Journal & Life Events" tagline="Five minutes at night, four questions: what went well, what went wrong, what you learned, what you'll improve tomorrow. That's the whole practice." />
      <Err msg={err} /><Ok msg={ok} />
      <Card title="Tonight's entry">
        <form onSubmit={addJournal} className="form-stack">
          <Field label="Date"><input type="date" required value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          {scale('Mood', mood, setMood)}
          {scale('Energy', energy, setEnergy)}
          <Field label="Free entry (optional)"><textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Anything on your mind…" /></Field>
          <Field label="What went well?"><textarea value={wentWell} onChange={(e) => setWentWell(e.target.value)} /></Field>
          <Field label="What went wrong?"><textarea value={wentWrong} onChange={(e) => setWentWrong(e.target.value)} /></Field>
          <Field label="What did you learn?"><textarea value={learned} onChange={(e) => setLearned(e.target.value)} /></Field>
          <Field label="Improve tomorrow"><textarea value={improve} onChange={(e) => setImprove(e.target.value)} /></Field>
          <button className="btn block" type="submit">Save entry</button>
        </form>
        {entries.length === 0 ? <Empty text="No journal entries yet." /> : entries.map((x) => (
          <div className="hrow" key={x.id}>
            <div className="hrow-main"><b>{x.entry_date}</b> · mood {x.mood ?? '—'} · energy {x.energy ?? '—'}</div>
            {x.body ? <div className="hrow-meta">{x.body.slice(0, 160)}</div> : null}
            <div className="hrow-actions"><button className="txt-danger" onClick={() => del('journal_entries', x.id)}>Delete</button></div>
          </div>
        ))}
      </Card>
      <Card title="Life events — where did the time & money go?">
        <form onSubmit={addEvent} className="form-stack">
          <Field label="What happened?"><input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Trip to Murree, family dawat…" /></Field>
          <Field label="Date"><input type="date" required value={eventDate} onChange={(e) => setEventDate(e.target.value)} /></Field>
          <Field label="Where? (optional)"><input value={destination} onChange={(e) => setDestination(e.target.value)} /></Field>
          <Field label="What did you do?"><textarea value={activities} onChange={(e) => setActivities(e.target.value)} /></Field>
          <Field label="Was it worth it?"><textarea value={outcomes} onChange={(e) => setOutcomes(e.target.value)} /></Field>
          <Field label="Money spent (PKR, optional)"><input type="number" step="0.01" value={money} onChange={(e) => setMoney(e.target.value)} /></Field>
          {scale('How important was it?', importance, setImportance)}
          <button className="btn block" type="submit">Save event</button>
        </form>
        {events.length === 0 ? <Empty text="No life events yet." /> : events.map((x) => (
          <div className="hrow" key={x.id}>
            <div className="hrow-main"><b>{x.title}</b> · {x.event_date}{x.destination ? ` · ${x.destination}` : ''}</div>
            {x.money_spent ? <div className="hrow-meta">PKR {x.money_spent}</div> : null}
            <div className="hrow-actions"><button className="txt-danger" onClick={() => del('life_events', x.id)}>Delete</button></div>
          </div>
        ))}
      </Card>
    </div>
  );
}
