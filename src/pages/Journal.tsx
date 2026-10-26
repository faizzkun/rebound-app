import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { todayKarachi } from '../lib/date';
import { Card, Field, Err, Ok, errText } from '../components/ui';
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
    setTitle(''); setDestination(''); setActivities(''); setOutcomes(''); setMoney(''); setOk('Life event saved (time audit). Private unless you explicitly opt it in later.'); load();
  }
  async function del(table: string, id: string) {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) setErr(errText(error)); else load();
  }

  return (
    <div>
      <Err msg={err} /><Ok msg={ok} />
      <Card title="Journal" sub="Private. What went well, what went wrong, what you learned, what to improve tomorrow — plus mood and energy (1–5).">
        <form onSubmit={addJournal} className="grid">
          <Field label="Date"><input type="date" required value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Mood (1–5)"><input type="number" min={1} max={5} value={mood} onChange={(e) => setMood(e.target.value)} /></Field>
          <Field label="Energy (1–5)"><input type="number" min={1} max={5} value={energy} onChange={(e) => setEnergy(e.target.value)} /></Field>
          <Field label="Entry"><textarea value={body} onChange={(e) => setBody(e.target.value)} /></Field>
          <Field label="Went well"><textarea value={wentWell} onChange={(e) => setWentWell(e.target.value)} /></Field>
          <Field label="Went wrong"><textarea value={wentWrong} onChange={(e) => setWentWrong(e.target.value)} /></Field>
          <Field label="Learned"><textarea value={learned} onChange={(e) => setLearned(e.target.value)} /></Field>
          <Field label="Improve tomorrow"><textarea value={improve} onChange={(e) => setImprove(e.target.value)} /></Field>
          <div style={{ alignSelf: 'end' }}><button className="btn" type="submit">Save entry</button></div>
        </form>
        <ul className="list">{entries.map((x) => (
          <li key={x.id}><span>{x.entry_date} · mood {x.mood ?? '—'} · energy {x.energy ?? '—'}{x.body ? ` · ${x.body.slice(0, 120)}` : ''}</span>
            <button className="btn danger small" onClick={() => del('journal_entries', x.id)}>Delete</button></li>
        ))}{entries.length === 0 ? <li className="muted">No journal entries yet.</li> : null}</ul>
      </Card>
      <Card title="Life events / time audit" sub="Trips, outings, big days — where the time and money actually went, and whether it was worth it. Saved private (is_public = false) by default.">
        <form onSubmit={addEvent} className="grid">
          <Field label="Title"><input required value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
          <Field label="Date"><input type="date" required value={eventDate} onChange={(e) => setEventDate(e.target.value)} /></Field>
          <Field label="Destination"><input value={destination} onChange={(e) => setDestination(e.target.value)} /></Field>
          <Field label="Activities"><textarea value={activities} onChange={(e) => setActivities(e.target.value)} /></Field>
          <Field label="Outcomes"><textarea value={outcomes} onChange={(e) => setOutcomes(e.target.value)} /></Field>
          <Field label="Money spent (PKR)"><input type="number" step="0.01" value={money} onChange={(e) => setMoney(e.target.value)} /></Field>
          <Field label="Importance (1–5)"><input type="number" min={1} max={5} value={importance} onChange={(e) => setImportance(e.target.value)} /></Field>
          <div style={{ alignSelf: 'end' }}><button className="btn" type="submit">Save event</button></div>
        </form>
        <ul className="list">{events.map((x) => (
          <li key={x.id}><span>{x.event_date} · <b>{x.title}</b>{x.destination ? ` · ${x.destination}` : ''}{x.money_spent ? ` · PKR ${x.money_spent}` : ''}</span>
            <button className="btn danger small" onClick={() => del('life_events', x.id)}>Delete</button></li>
        ))}{events.length === 0 ? <li className="muted">No life events yet.</li> : null}</ul>
      </Card>
    </div>
  );
}
