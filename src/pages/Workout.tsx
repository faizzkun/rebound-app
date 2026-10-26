import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { todayKarachi } from '../lib/date';
import { Card, Field, Err, Ok, errText } from '../components/ui';
import type { WorkoutSession, WorkoutExercise } from '../lib/types';

export default function Workout({ userId }: { userId: string }) {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [date, setDate] = useState(todayKarachi());
  const [minutes, setMinutes] = useState('');
  const [status, setStatus] = useState('completed');
  const [notes, setNotes] = useState('');
  const [exSession, setExSession] = useState('');
  const [exName, setExName] = useState('');
  const [sets, setSets] = useState('');
  const [reps, setReps] = useState('');
  const [weight, setWeight] = useState('');

  async function load() {
    const [s, x] = await Promise.all([
      supabase.from('workout_sessions').select('*').eq('owner_id', userId).order('session_date', { ascending: false }).limit(30),
      supabase.from('workout_exercises').select('*').eq('owner_id', userId).order('created_at', { ascending: false }).limit(100),
    ]);
    if (s.error || x.error) { setErr(errText(s.error || x.error)); return; }
    setSessions(s.data as WorkoutSession[]); setExercises(x.data as WorkoutExercise[]);
    if (!exSession && s.data?.length) setExSession((s.data as WorkoutSession[])[0].id);
  }
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function addSession(e: React.FormEvent) {
    e.preventDefault(); setErr(null);
    const { data, error } = await supabase.from('workout_sessions').insert({ owner_id: userId, session_date: date, duration_minutes: minutes ? Number(minutes) : null, status, notes: notes || null }).select().single();
    if (error) { setErr(errText(error)); return; }
    setExSession(data.id); setOk('Workout session saved.'); load();
  }
  async function addExercise(e: React.FormEvent) {
    e.preventDefault(); setErr(null);
    if (!exSession) { setErr('Create a workout session first.'); return; }
    const { error } = await supabase.from('workout_exercises').insert({ session_id: exSession, owner_id: userId, exercise_name: exName, sets: sets ? Number(sets) : null, reps: reps ? Number(reps) : null, weight: weight ? Number(weight) : null });
    if (error) { setErr(errText(error)); return; }
    setExName(''); setSets(''); setReps(''); setWeight(''); setOk('Exercise added.'); load();
  }
  async function del(table: string, id: string) {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) setErr(errText(error)); else load();
  }

  return (
    <div>
      <Err msg={err} /><Ok msg={ok} />
      <Card title="Workout session">
        <form onSubmit={addSession} className="grid">
          <Field label="Date"><input type="date" required value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Minutes"><input type="number" min={0} value={minutes} onChange={(e) => setMinutes(e.target.value)} /></Field>
          <Field label="Status"><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="completed">completed</option><option value="partial">partial</option><option value="skipped">skipped</option><option value="unlogged">unlogged</option></select></Field>
          <Field label="Notes"><input value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
          <div style={{ alignSelf: 'end' }}><button className="btn" type="submit">Save session</button></div>
        </form>
      </Card>
      <Card title="Add exercise to a session">
        <form onSubmit={addExercise} className="grid">
          <Field label="Session"><select value={exSession} onChange={(e) => setExSession(e.target.value)}>{sessions.map((s) => <option key={s.id} value={s.id}>{s.session_date} · {s.status} · {s.duration_minutes ?? '—'} min</option>)}</select></Field>
          <Field label="Exercise"><input required value={exName} onChange={(e) => setExName(e.target.value)} /></Field>
          <Field label="Sets"><input type="number" value={sets} onChange={(e) => setSets(e.target.value)} /></Field>
          <Field label="Reps"><input type="number" value={reps} onChange={(e) => setReps(e.target.value)} /></Field>
          <Field label="Weight"><input type="number" step="0.5" value={weight} onChange={(e) => setWeight(e.target.value)} /></Field>
          <div style={{ alignSelf: 'end' }}><button className="btn" type="submit">Add exercise</button></div>
        </form>
      </Card>
      <Card title="Sessions + exercises">
        <ul className="list">{sessions.map((s) => (
          <li key={s.id}><span>{s.session_date} · {s.status} · {s.duration_minutes ?? '—'} min{s.notes ? ` · ${s.notes}` : ''}
            {exercises.filter((x) => x.session_id === s.id).map((x) => <span key={x.id} className="pill" style={{ marginLeft: 6 }}>{x.exercise_name} {x.sets ?? '—'}×{x.reps ?? '—'}{x.weight ? ` @ ${x.weight}` : ''}</span>)}
          </span><button className="btn danger small" onClick={() => del('workout_sessions', s.id)}>Delete session</button></li>
        ))}{sessions.length === 0 ? <li className="muted">No workouts yet.</li> : null}</ul>
      </Card>
    </div>
  );
}
