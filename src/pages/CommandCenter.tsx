import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { todayKarachi, prettyDate, hhmmDuration, isoDuration, fmtMinutes, findOverlaps } from '../lib/date';
import { computeScore, PRAYERS } from '../lib/score';
import { Card, Err, errText } from '../components/ui';
import type { PrayerLog, FocusSession, SleepRow, HabitDef, HabitLog, GroomingLog, WorkoutSession, ReadingSession, JournalEntry, Profile } from '../lib/types';

export default function CommandCenter({ userId, go }: { userId: string; go: (tab: string) => void }) {
  const today = todayKarachi();
  const [err, setErr] = useState<string | null>(null);
  const [prayers, setPrayers] = useState<PrayerLog[]>([]);
  const [focus, setFocus] = useState<FocusSession[]>([]);
  const [sleep, setSleep] = useState<SleepRow | null>(null);
  const [habits, setHabits] = useState<HabitDef[]>([]);
  const [habitLogs, setHabitLogs] = useState<HabitLog[]>([]);
  const [grooming, setGrooming] = useState<GroomingLog[]>([]);
  const [workoutDone, setWorkoutDone] = useState(false);
  const [readingDone, setReadingDone] = useState(false);
  const [journalDone, setJournalDone] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  async function load() {
    try {
      const [pr, fo, sl, hd, hl, gr, wo, rd, jo, pf] = await Promise.all([
        supabase.from('prayer_logs').select('*').eq('owner_id', userId).eq('prayer_date', today),
        supabase.from('focus_sessions').select('*').eq('owner_id', userId).eq('session_date', today).order('start_at'),
        supabase.from('sleep_sessions').select('*').eq('owner_id', userId).order('bed_date', { ascending: false }).limit(1),
        supabase.from('habit_definitions').select('*').eq('owner_id', userId).eq('active', true),
        supabase.from('habit_logs').select('*').eq('owner_id', userId).eq('log_date', today),
        supabase.from('grooming_logs').select('*').eq('owner_id', userId).eq('log_date', today),
        supabase.from('workout_sessions').select('*').eq('owner_id', userId).eq('session_date', today).eq('status', 'completed').limit(1),
        supabase.from('reading_sessions').select('*').eq('owner_id', userId).eq('session_date', today).limit(1),
        supabase.from('journal_entries').select('*').eq('owner_id', userId).eq('entry_date', today).limit(1),
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      ]);
      const firstErr = [pr, fo, sl, hd, hl, gr, wo, rd, jo, pf].find((r) => r.error)?.error;
      if (firstErr) throw firstErr;
      setPrayers(pr.data as PrayerLog[]);
      setFocus(fo.data as FocusSession[]);
      setSleep((sl.data as SleepRow[])[0] ?? null);
      setHabits(hd.data as HabitDef[]);
      setHabitLogs(hl.data as HabitLog[]);
      setGrooming(gr.data as GroomingLog[]);
      setWorkoutDone(((wo.data as WorkoutSession[]) ?? []).length > 0);
      setReadingDone(((rd.data as ReadingSession[]) ?? []).length > 0);
      setJournalDone(((jo.data as JournalEntry[]) ?? []).length > 0);
      setProfile(pf.data as Profile | null);
    } catch (e) { setErr(errText(e)); }
  }
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function togglePrayer(prayer: string) {
    const existing = prayers.find((p) => p.prayer === prayer);
    const next = !existing?.performed;
    const { error } = await supabase.from('prayer_logs').upsert(
      { owner_id: userId, prayer_date: today, prayer, performed: next, performed_at: next ? new Date().toISOString() : null },
      { onConflict: 'owner_id,prayer_date,prayer' },
    );
    if (error) { setErr(errText(error)); return; }
    load();
  }

  const focusMinutes = focus.reduce((sum, s) => sum + (isoDuration(s.start_at, s.end_at) ?? 0), 0);
  const target = profile?.focus_daily_target_minutes ?? 240;
  const overlaps = findOverlaps(focus);
  const habitsDone = habits.length > 0 && habits.every((h) => habitLogs.some((l) => l.habit_id === h.id && l.done));
  const score = computeScore({
    prayersPerformed: prayers.filter((p) => p.performed).length,
    sleepWithWake: Boolean(sleep?.wake_time),
    focusMinutes, focusTarget: target,
    workoutCompleted: workoutDone,
    habitsApplicable: habits.length > 0,
    habitsAllDone: habitsDone,
    groomingBothSlots: grooming.some((g) => g.slot === 'morning') && grooming.some((g) => g.slot === 'evening'),
    readingDone, journalDone,
  });

  return (
    <div>
      <Err msg={err} />
      <Card title={`Command Center — ${prettyDate(today)}`} sub="Asia/Karachi. Unlogged does not mean failed — it just means not logged yet. A missed day is followed by a rebound, not a reset of your worth.">
        <div className="score"><span>{score.score === null ? '—' : `${Math.round(score.score * 100)}%`}</span> <span style={{ fontSize: 16, color: '#9a9a9a' }}>provisional · {score.completed}/{score.denominator} categories</span></div>
        <ul className="list">
          {score.breakdown.map((b) => (
            <li key={b.label}><span>{b.label}{!b.applicable ? ' (not applicable)' : ''}</span><span className={b.done ? 'pill lime' : 'pill'}>{b.done ? 'Done' : 'Open'}</span></li>
          ))}
        </ul>
        <p className="muted">Formula: completed categories ÷ applicable categories. Habits count only when you have active habit definitions. The score becomes final only when you press Finish Day (Settings).</p>
        <button className="btn" onClick={() => go('settings')}>Finish Day →</button>
      </Card>

      {overlaps.length > 0 ? <div className="warn">⚠ Overlapping focus sessions detected today ({overlaps.length} overlap). Overlaps are flagged, not double-counted as extra time — fix them on the Focus page.</div> : null}

      <div className="grid">
        <Card title="Today's prayers">
          {PRAYERS.map((p) => {
            const row = prayers.find((x) => x.prayer === p);
            return (
              <label className="check" key={p}>
                <input type="checkbox" checked={Boolean(row?.performed)} onChange={() => togglePrayer(p)} />
                <span style={{ textTransform: 'capitalize' }}>{p}</span>
                {row?.is_qaza ? <span className="pill">qaza</span> : null}
              </label>
            );
          })}
          <button className="btn ghost small" onClick={() => go('prayer')}>Prayer + Qaza details →</button>
        </Card>
        <Card title="Focus today" sub={`Target ${target} min`}>
          <div className="score" style={{ fontSize: 28 }}><span>{fmtMinutes(focusMinutes)}</span></div>
          <p className="muted">{focus.filter((f) => f.end_at).length} completed sessions{focus.some((f) => !f.end_at) ? ' · 1 running' : ''}</p>
          <button className="btn ghost small" onClick={() => go('focus')}>Open Focus timer →</button>
        </Card>
        <Card title="Last sleep">
          {sleep ? (
            <p>{prettyDate(sleep.bed_date)} · bed {sleep.bedtime}{sleep.wake_time ? ` → wake ${sleep.wake_time} (${fmtMinutes(hhmmDuration(sleep.bedtime, sleep.wake_time))})` : ' · wake time not logged yet — duration is not finalized until you wake.'}</p>
          ) : <p className="muted">No sleep session logged yet.</p>}
          <button className="btn ghost small" onClick={() => go('sleep')}>Log sleep →</button>
        </Card>
        <Card title="Today's habits">
          {habits.length === 0 ? <p className="muted">No active habits yet.</p> : habits.map((h) => (
            <p key={h.id}>{habitLogs.some((l) => l.habit_id === h.id && l.done) ? '✓' : '○'} {h.name}</p>
          ))}
          <button className="btn ghost small" onClick={() => go('habits')}>Habits + Grooming →</button>
        </Card>
      </div>
    </div>
  );
}
