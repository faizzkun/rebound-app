import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { todayKarachi } from '../lib/date';
import { Card, Field, Err, Ok, errText, PageHead, Empty } from '../components/ui';
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
    setOk('Reading session saved — your bookmark moved to the end page you gave.'); load();
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
    <div className="page-narrow">
      <PageHead title="Reading" tagline="Log what you read and the app remembers exactly where you stopped — book, page, even your last sentence — so you can pick up mid-thought tomorrow." />
      <Err msg={err} /><Ok msg={ok} />
      <Card title="Log a reading session">
        <form onSubmit={addSession} className="form-stack">
          <Field label="Book title"><input required value={book} onChange={(e) => setBook(e.target.value)} placeholder="Which book?" /></Field>
          <Field label="Author (optional)"><input value={author} onChange={(e) => setAuthor(e.target.value)} /></Field>
          <div className="grid">
            <Field label="From page"><input type="number" value={startPage} onChange={(e) => setStartPage(e.target.value)} /></Field>
            <Field label="To page"><input type="number" value={endPage} onChange={(e) => setEndPage(e.target.value)} /></Field>
          </div>
          <Field label="Minutes spent"><input type="number" min={0} value={minutes} onChange={(e) => setMinutes(e.target.value)} /></Field>
          <Field label="Last sentence (optional — your bookmark)"><input value={lastSentence} onChange={(e) => setLastSentence(e.target.value)} /></Field>
          <button className="btn block" type="submit">Save session</button>
        </form>
      </Card>
      <Card title="Where you stopped">
        {bookmarks.length === 0 ? <Empty text="No bookmarks yet. They appear automatically when you log an end page." /> : bookmarks.map((b) => (
          <div className="hrow" key={b.id}>
            <div className="hrow-main"><b>{b.book_title}</b>{b.author ? ` — ${b.author}` : ''}</div>
            <div className="hrow-meta">Page {b.last_page ?? '—'}{b.last_sentence ? ` · “${b.last_sentence}”` : ''}</div>
            <div className="hrow-actions"><button className="txt-danger" onClick={() => del('reading_bookmarks', b.id)}>Delete</button></div>
          </div>
        ))}
      </Card>
      <Card title="Recent sessions">
        {sessions.length === 0 ? <Empty text="No reading sessions yet." /> : sessions.map((s) => (
          <div className="hrow" key={s.id}>
            <div className="hrow-main"><b>{s.book_title}</b> · {s.session_date}</div>
            <div className="hrow-meta">Pages {s.start_page ?? '—'}–{s.end_page ?? '—'} · {s.duration_minutes ?? '—'} min</div>
            <div className="hrow-actions"><button className="txt-danger" onClick={() => del('reading_sessions', s.id)}>Delete</button></div>
          </div>
        ))}
      </Card>
      <Card title="What did you actually learn?">
        <form onSubmit={addNote} className="form-stack">
          <Field label="Title (optional)"><input value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} /></Field>
          <Field label="Takeaways"><textarea value={takeaways} onChange={(e) => setTakeaways(e.target.value)} /></Field>
          <Field label="New knowledge"><textarea value={learned} onChange={(e) => setLearned(e.target.value)} /></Field>
          <Field label="Lessons learned"><textarea value={lessons} onChange={(e) => setLessons(e.target.value)} /></Field>
          <button className="btn block" type="submit">Save note</button>
        </form>
        {notes.map((n) => (
          <div className="hrow" key={n.id}>
            <div className="hrow-main">{n.note_date} · <b>{n.title ?? '(untitled)'}</b></div>
            {n.takeaways ? <div className="hrow-meta">{n.takeaways}</div> : null}
            <div className="hrow-actions"><button className="txt-danger" onClick={() => del('learning_notes', n.id)}>Delete</button></div>
          </div>
        ))}
      </Card>
    </div>
  );
}
