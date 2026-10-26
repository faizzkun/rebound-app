import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { todayKarachi } from '../lib/date';
import { Card, Field, Err, Ok, errText, PageHead, Seg, Empty } from '../components/ui';
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
    setExSession(data.id); setOk('Workout saved.'); load();
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
    <div className="page-narrow">
      <PageHead title="Workout" tagline="One session, then the exercises inside it. Pick how it went — a partial session still counts as showing up." />
      <Err msg={err} /><Ok msg={ok} />
      <Card title="Log a workout">
        <form onSubmit={addSession} className="form-stack">
          <Field label="Date"><input type="date" required value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Minutes"><input type="number" min={0} value={minutes} onChange={(e) => setMinutes(e.target.value)} placeholder="How long?" /></Field>
          <Seg label="How did it go?" value={status} onChange={setStatus} options={[
            { value: 'completed', label: 'Completed' }, { value: 'partial', label: 'Partial' },
            { value: 'skipped', label: 'Skipped' }, { value: 'unlogged', label: 'Unlogged' },
          ]} />
          <Field label="Notes (optional)"><input value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
          <button className="btn block" type="submit">Save workout</button>
        </form>
      </Card>
      <Card title="Add exercises to a session">
        <form onSubmit={addExercise} className="form-stack">
          <Field label="Session"><select value={exSession} onChange={(e) => setExSession(e.target.value)}>{sessions.map((s) => <option key={s.id} value={s.id}>{s.session_date} · {s.status} · {s.duration_minutes ?? '—'} min</option>)}</select></Field>
          <Field label="Exercise"><input required value={exName} onChange={(e) => setExName(e.target.value)} placeholder="e.g. Push-ups" /></Field>
          <div className="grid">
            <Field label="Sets"><input type="number" value={sets} onChange={(e) => setSets(e.target.value)} /></Field>
            <Field label="Reps"><input type="number" value={reps} onChange={(e) => setReps(e.target.value)} /></Field>
            <Field label="Weight"><input type="number" step="0.5" value={weight} onChange={(e) => setWeight(e.target.value)} /></Field>
          </div>
          <button className="btn block" type="submit">Add exercise</button>
        </form>
      </Card>
      <Card title="Past workouts">
        {sessions.length === 0 ? <Empty text="No workouts yet. Log your first one above." /> : sessions.map((s) => (
          <div className="hrow" key={s.id}>
            <div className="hrow-main"><b>{s.session_date}</b> · {s.status} · {s.duration_minutes ?? '—'} min{s.notes ? ` · ${s.notes}` : ''}</div>
            {exercises.filter((x) => x.session_id === s.id).length > 0 ? (
              <div className="hrow-meta">{exercises.filter((x) => x.session_id === s.id).map((x) => `${x.exercise_name} ${x.sets ?? '—'}×${x.reps ?? '—'}${x.weight ? ` @ ${x.weight}` : ''}`).join(' · ')}</div>
            ) : null}
            <div className="hrow-actions"><button className="txt-danger" onClick={() => del('workout_sessions', s.id)}>Delete session</button></div>
          </div>
        ))}
      </Card>
    </div>
  );
}
