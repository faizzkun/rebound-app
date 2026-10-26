import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { todayKarachi } from '../lib/date';
import { Card, Field, Err, Ok, errText } from '../components/ui';
import type { ReadingSession, Bookmark, LearningNote } from '../lib/types';

export default function Reading({ userId }: { userId: string }) {
  const [sessions, setSessions] = useState<ReadingSession[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [notes, setNotes] = useState<LearningNote[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [book, setBook] = useState('');
  const [author, setAuthor] = useState('');
  const [startPage, setStartPage] = useState('');
  const [endPage, setEndPage] = useState('');
  const [minutes, setMinutes] = useState('');
  const [lastSentence, setLastSentence] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [takeaways, setTakeaways] = useState('');
  const [learned, setLearned] = useState('');
  const [lessons, setLessons] = useState('');

  async function load() {
    const [s, b, n] = await Promise.all([
      supabase.from('reading_sessions').select('*').eq('owner_id', userId).order('session_date', { ascending: false }).limit(50),
      supabase.from('reading_bookmarks').select('*').eq('owner_id', userId).order('book_title'),
      supabase.from('learning_notes').select('*').eq('owner_id', userId).order('note_date', { ascending: false }).limit(50),
    ]);
    const e = s.error || b.error || n.error;
    if (e) { setErr(errText(e)); return; }
    setSessions(s.data as ReadingSession[]); setBookmarks(b.data as Bookmark[]); setNotes(n.data as LearningNote[]);
  }
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function addSession(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setOk(null);
    const { error } = await supabase.from('reading_sessions').insert({
      owner_id: userId, book_title: book, author: author || null,
      start_page: startPage ? Number(startPage) : null, end_page: endPage ? Number(endPage) : null,
      duration_minutes: minutes ? Number(minutes) : null, last_sentence: lastSentence || null, session_date: todayKarachi(),
    });
    if (error) { setErr(errText(error)); return; }
    if (endPage) {
      await supabase.from('reading_bookmarks').upsert(
        { owner_id: userId, book_title: book, author: author || null, last_page: Number(endPage), last_sentence: lastSentence || null },
        { onConflict: 'owner_id,book_title' },
      );
    }
    setOk('Reading session saved (bookmark updated when an end page was given).'); load();
  }
  async function addNote(e: React.FormEvent) {
    e.preventDefault(); setErr(null);
    const { error } = await supabase.from('learning_notes').insert({
      owner_id: userId, title: noteTitle || null, takeaways: takeaways || null,
      new_knowledge: learned || null, lessons_learned: lessons || null, note_date: todayKarachi(),
    });
    if (error) { setErr(errText(error)); return; }
    setNoteTitle(''); setTakeaways(''); setLearned(''); setLessons(''); setOk('Learning note saved.'); load();
  }
  async function del(table: string, id: string) {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) setErr(errText(error)); else load();
  }

  return (
    <div>
      <Err msg={err} /><Ok msg={ok} />
      <Card title="Reading session" sub="Per-book bookmarks remember where you stopped — book title, last page, last sentence — so you can resume exactly there.">
        <form onSubmit={addSession} className="grid">
          <Field label="Book title"><input required value={book} onChange={(e) => setBook(e.target.value)} /></Field>
          <Field label="Author"><input value={author} onChange={(e) => setAuthor(e.target.value)} /></Field>
          <Field label="Start page"><input type="number" value={startPage} onChange={(e) => setStartPage(e.target.value)} /></Field>
          <Field label="End page"><input type="number" value={endPage} onChange={(e) => setEndPage(e.target.value)} /></Field>
          <Field label="Minutes"><input type="number" min={0} value={minutes} onChange={(e) => setMinutes(e.target.value)} /></Field>
          <Field label="Last sentence"><input value={lastSentence} onChange={(e) => setLastSentence(e.target.value)} /></Field>
          <div style={{ alignSelf: 'end' }}><button className="btn" type="submit">Save session</button></div>
        </form>
      </Card>
      <Card title="Bookmarks">
        <ul className="list">{bookmarks.map((b) => (
          <li key={b.id}><span><b>{b.book_title}</b>{b.author ? ` — ${b.author}` : ''} · page {b.last_page ?? '—'}{b.last_sentence ? ` · “${b.last_sentence}”` : ''}</span>
            <button className="btn danger small" onClick={() => del('reading_bookmarks', b.id)}>Delete</button></li>
        ))}{bookmarks.length === 0 ? <li className="muted">No bookmarks yet.</li> : null}</ul>
      </Card>
      <Card title="Recent reading sessions">
        <ul className="list">{sessions.map((s) => (
          <li key={s.id}><span>{s.session_date} · <b>{s.book_title}</b> · pages {s.start_page ?? '—'}–{s.end_page ?? '—'} · {s.duration_minutes ?? '—'} min</span>
            <button className="btn danger small" onClick={() => del('reading_sessions', s.id)}>Delete</button></li>
        ))}{sessions.length === 0 ? <li className="muted">No reading sessions yet.</li> : null}</ul>
      </Card>
      <Card title="Learning notes" sub="What did you actually learn? Capture takeaways, new knowledge, and lessons — searchable later from Global Search.">
        <form onSubmit={addNote} className="grid">
          <Field label="Title"><input value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} /></Field>
          <Field label="Takeaways"><textarea value={takeaways} onChange={(e) => setTakeaways(e.target.value)} /></Field>
          <Field label="New knowledge"><textarea value={learned} onChange={(e) => setLearned(e.target.value)} /></Field>
          <Field label="Lessons learned"><textarea value={lessons} onChange={(e) => setLessons(e.target.value)} /></Field>
          <div style={{ alignSelf: 'end' }}><button className="btn" type="submit">Save note</button></div>
        </form>
        <ul className="list">{notes.map((n) => (
          <li key={n.id}><span>{n.note_date} · <b>{n.title ?? '(untitled)'}</b>{n.takeaways ? ` — ${n.takeaways}` : ''}</span>
            <button className="btn danger small" onClick={() => del('learning_notes', n.id)}>Delete</button></li>
        ))}</ul>
      </Card>
    </div>
  );
}
