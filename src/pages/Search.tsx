import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Card, Field, Err, errText } from '../components/ui';

interface Hit { source: string; title: string; snippet: string }

export default function Search({ userId }: { userId: string }) {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  async function run(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setSearched(true);
    if (!q.trim()) { setHits([]); return; }
    const like = `%${q.trim()}%`;
    const [j, n, r, b] = await Promise.all([
      supabase.from('journal_entries').select('entry_date,body,learned').eq('owner_id', userId).or(`body.ilike.${like},learned.ilike.${like}`).limit(20),
      supabase.from('learning_notes').select('note_date,title,takeaways,reflection').eq('owner_id', userId).or(`title.ilike.${like},takeaways.ilike.${like},reflection.ilike.${like}`).limit(20),
      supabase.from('reading_sessions').select('session_date,book_title,last_sentence').eq('owner_id', userId).ilike('book_title', like).limit(20),
      supabase.from('reading_bookmarks').select('book_title,last_sentence').eq('owner_id', userId).ilike('book_title', like).limit(20),
    ]);
    const e0 = j.error || n.error || r.error || b.error;
    if (e0) { setErr(errText(e0)); return; }
    const out: Hit[] = [];
    (j.data as { entry_date: string; body: string | null; learned: string | null }[]).forEach((x) => out.push({ source: 'Journal', title: x.entry_date, snippet: (x.body ?? x.learned ?? '').slice(0, 160) }));
    (n.data as { note_date: string; title: string | null; takeaways: string | null; reflection: string | null }[]).forEach((x) => out.push({ source: 'Learning note', title: `${x.note_date} · ${x.title ?? '(untitled)'}`, snippet: (x.takeaways ?? x.reflection ?? '').slice(0, 160) }));
    (r.data as { session_date: string; book_title: string; last_sentence: string | null }[]).forEach((x) => out.push({ source: 'Reading session', title: `${x.session_date} · ${x.book_title}`, snippet: x.last_sentence ?? '' }));
    (b.data as { book_title: string; last_sentence: string | null }[]).forEach((x) => out.push({ source: 'Bookmark', title: x.book_title, snippet: x.last_sentence ?? '' }));
    setHits(out);
  }

  return (
    <div>
      <Err msg={err} />
      <Card title="Global search" sub="Searches your own journal entries, learning notes, and book titles/bookmarks. Nothing leaves your account — search runs against your own rows only.">
        <form onSubmit={run} className="grid">
          <Field label="Search"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. a book title, a lesson, a journal word…" /></Field>
          <div style={{ alignSelf: 'end' }}><button className="btn" type="submit">Search</button></div>
        </form>
        <ul className="list">{hits.map((h, i) => (
          <li key={i}><span><span className="pill">{h.source}</span> <b>{h.title}</b>{h.snippet ? ` — ${h.snippet}` : ''}</span></li>
        ))}</ul>
        {searched && hits.length === 0 ? <p className="muted">No matches found.</p> : null}
      </Card>
    </div>
  );
}
