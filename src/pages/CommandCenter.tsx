import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { todayKarachi, prettyDate, hhmmDuration, isoDuration, fmtMinutes, findOverlaps } from '../lib/date';
import { computeScore, PRAYERS } from '../lib/score';
import { Card, Err, errText, Ring, ProgressBar, Stat, TrendChart, BarsChart, Toggle } from '../components/ui';
import { I } from '../components/icons';
import type { PrayerLog, FocusSession, SleepRow, HabitDef, HabitLog, GroomingLog, WorkoutSession, ReadingSession, JournalEntry, Profile, DailySummary } from '../lib/types';

function karachiHour(): number {
  return Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Karachi', hour: 'numeric', hour12: false }).format(new Date()));
}
function shortLabel(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short' }).format(new Date(Date.UTC(y, m - 1, d, 12)));
}
function weekdayShort(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', weekday: 'short' }).format(new Date(Date.UTC(y, m - 1, d, 12)));
}
function dateMinus(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d) - n * 86400000).toISOString().slice(0, 10);
}
const TONES = ['tone-lime', 'tone-teal', 'tone-violet', 'tone-pink', 'tone-amber', 'tone-sky'];

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
  const [summaries, setSummaries] = useState<DailySummary[]>([]);
  const [focusWeek, setFocusWeek] = useState<{ date: string; minutes: number }[]>([]);

  async function load() {
    try {
      const [y, m, d] = today.split('-').map(Number);
      const base = new Date(Date.UTC(y, m - 1, d));
      const weekDates = Array.from({ length: 7 }, (_, k) => new Date(base.getTime() - (6 - k) * 86400000).toISOString().slice(0, 10));
      const [pr, fo, sl, hd, hl, gr, wo, rd, jo, pf, su, fw] = await Promise.all([
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
        supabase.from('daily_summaries').select('id,owner_id,summary_date,discipline_score,score_denominator,score_status,finalized_at').eq('owner_id', userId).eq('score_status', 'final').order('summary_date', { ascending: false }).limit(90),
        supabase.from('focus_sessions').select('session_date,start_at,end_at').eq('owner_id', userId).gte('session_date', weekDates[0]).lte('session_date', today),
      ]);
      const firstErr = [pr, fo, sl, hd, hl, gr, wo, rd, jo, pf, su, fw].find((r) => r.error)?.error;
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
      setSummaries([...((su.data as DailySummary[]) ?? [])].reverse());
      const perDay = new Map<string, number>(weekDates.map((dt) => [dt, 0]));
      for (const s of (fw.data as { session_date: string; start_at: string; end_at: string | null }[]) ?? []) {
        const mins = isoDuration(s.start_at, s.end_at) ?? 0;
        perDay.set(s.session_date, (perDay.get(s.session_date) ?? 0) + mins);
      }
      setFocusWeek(weekDates.map((dt) => ({ date: dt, minutes: perDay.get(dt) ?? 0 })));
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

  async function toggleHabit(h: HabitDef) {
    const existing = habitLogs.find((l) => l.habit_id === h.id);
    if (existing) {
      await supabase.from('habit_logs').update({ done: !existing.done }).eq('id', existing.id);
    } else {
      await supabase.from('habit_logs').insert({ owner_id: userId, habit_id: h.id, log_date: today, done: true });
    }
    load();
  }

  const focusMinutes = focus.reduce((sum, s) => sum + (isoDuration(s.start_at, s.end_at) ?? 0), 0);
  const target = profile?.focus_daily_target_minutes ?? 240;
  const overlaps = findOverlaps(focus);
  const habitsDoneCount = habits.filter((h) => habitLogs.some((l) => l.habit_id === h.id && l.done)).length;
  const habitsDone = habits.length > 0 && habitsDoneCount === habits.length;
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
  const hour = karachiHour();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : hour < 21 ? 'Good evening' : 'Good night';
  const sleepMins = sleep?.wake_time ? hhmmDuration(sleep.bedtime, sleep.wake_time) : null;
  const trendPoints = summaries.filter((s) => s.discipline_score !== null).slice(-14).map((s) => ({ label: shortLabel(s.summary_date), value: s.discipline_score as number }));
  const weekTotal = focusWeek.reduce((a, b) => a + b.minutes, 0);

  // Streak system — a day counts when it was finished (Finish Day), never on vibes.
  const finalized = new Set(summaries.map((s) => s.summary_date));
  let streak = 0;
  let cursor = finalized.has(today) ? today : dateMinus(today, 1);
  while (finalized.has(cursor)) { streak++; cursor = dateMinus(cursor, 1); }
  let best = 0; let run = 0; let prev = '';
  for (const dt of [...finalized].sort()) {
    run = prev !== '' && dt === dateMinus(prev, -1) ? run + 1 : 1;
    best = Math.max(best, run); prev = dt;
  }
  const weekDots = Array.from({ length: 7 }, (_, k) => {
    const dt = dateMinus(today, 6 - k);
    return { dt, label: weekdayShort(dt).charAt(0), done: finalized.has(dt), isToday: dt === today };
  });

  return (
    <div>
      <Err msg={err} />
      {overlaps.length > 0 ? <div className="warn">Overlapping focus sessions detected today ({overlaps.length} overlap). Overlaps are flagged, not double-counted as extra time — fix them on the Focus page.</div> : null}

      <section className="hero-dark anim">
        <div className="hero-grid">
          <div>
            <div className="hero-kicker">Today · {prettyDate(today)} · Asia/Karachi</div>
            <h2 className="hero-title">{greet} — keep the streak alive.</h2>
            <p className="hero-sub">Unlogged does not mean failed. A missed day is followed by a rebound, not a reset of your worth.</p>
            <div className="hero-score-row">
              <Ring value={score.score} size={120} label="Today's provisional discipline score" />
              <div>
                <div className="hero-score-num"><b>{score.completed}/{score.denominator}</b> categories done · provisional</div>
                <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span className="streak-pill"><I name="flame" size={16} /> {streak} day streak{streak === 1 ? '' : 's'}{best > streak ? ` · best ${best}` : ''}</span>
                </div>
                <div className="row" style={{ marginTop: 12 }}>
                  <button className="btn" onClick={() => go('settings')}>Finish Day →</button>
                </div>
              </div>
            </div>
            <div className="weekdots">
              {weekDots.map((d) => (
                <span key={d.dt} className={`wdot${d.done ? ' done' : ''}${d.isToday ? ' today' : ''}`} title={d.dt}>{d.label}</span>
              ))}
              <span className="muted" style={{ alignSelf: 'center', marginLeft: 4 }}>{streak === 0 ? 'Finish a day to start your streak.' : 'Finish today to extend it.'}</span>
            </div>
          </div>
          <img className="hero-illus" src="/rebound-hero.png" alt="A runner climbing white steps toward a lime arc — the rebound" />
        </div>
      </section>

      <div className="grid" style={{ marginBottom: 16 }}>
        <div className="anim anim-d1"><Stat label="Focus today" value={fmtMinutes(focusMinutes)} sub={`${focus.filter((f) => f.end_at).length} completed sessions${focus.some((f) => !f.end_at) ? ' · 1 running' : ''} · target ${target}m`} icon={(<span className="icon-chip tone-amber"><I name="clock" size={22} /></span>)}>
          <ProgressBar value={target > 0 ? focusMinutes / target : 0} good={focusMinutes >= target} />
          <div className="row" style={{ marginTop: 12 }}><button className="btn ghost small" onClick={() => go('focus')}>Open Focus timer →</button></div>
        </Stat></div>
        <div className="anim anim-d1"><Stat label="Prayers today" value={`${prayers.filter((p) => p.performed).length}/5`} sub={workoutDone ? 'Workout done · Reading done' : `${workoutDone ? 'Workout done' : 'Workout open'} · ${readingDone ? 'Reading done' : 'Reading open'}`} icon={(<span className="icon-chip tone-teal"><I name="moon" size={22} /></span>)}>
          <div className="dots">
            {PRAYERS.map((p) => {
              const done = prayers.some((x) => x.prayer === p && x.performed);
              return <span key={p} className={`dot${done ? ' on' : ''}`} title={p}>{done ? '✓' : ''}</span>;
            })}
          </div>
          <div className="row" style={{ marginTop: 12 }}><button className="btn ghost small" onClick={() => go('prayer')}>Prayer + Qaza →</button></div>
        </Stat></div>
        <div className="anim anim-d2"><Stat label="Last sleep" value={sleepMins !== null ? fmtMinutes(sleepMins) : '—'} sub={sleep ? `${prettyDate(sleep.bed_date)} · bed ${sleep.bedtime}${sleep.wake_time ? ` → wake ${sleep.wake_time}` : ' · wake time not logged yet — duration is not finalized until you wake.'}` : 'No sleep session logged yet.'} icon={(<span className="icon-chip tone-sky"><I name="bed" size={22} /></span>)}>
          <div className="row" style={{ marginTop: 12 }}><button className="btn ghost small" onClick={() => go('sleep')}>Log sleep →</button></div>
        </Stat></div>
        <div className="anim anim-d2"><Stat label="Habits today" value={habits.length === 0 ? '—' : `${habitsDoneCount}/${habits.length}`} sub={habits.length === 0 ? 'No active habits yet — add one on the Habits page.' : `${habitsDone ? 'All habits done' : 'Keep going'} · Grooming ${grooming.some((g) => g.slot === 'morning') && grooming.some((g) => g.slot === 'evening') ? 'morning + evening done' : 'incomplete'}`} icon={(<span className="icon-chip tone-lime"><I name="check" size={22} /></span>)}>
          {habits.length > 0 ? <ProgressBar value={habitsDoneCount / habits.length} good={habitsDone} /> : null}
          <div className="row" style={{ marginTop: 12 }}><button className="btn ghost small" onClick={() => go('habits')}>Habits + Grooming →</button></div>
        </Stat></div>
      </div>

      <div className="grid2 anim anim-d3" style={{ marginBottom: 16 }}>
        <Card title="Score trend — finalized days" sub="Only days you finished with Finish Day appear here. Today stays provisional until you finish it.">
          {trendPoints.length >= 2 ? (
            <TrendChart points={trendPoints} />
          ) : (
            <div className="chart-empty">No trend yet. Finish your first day (Settings → Finish Day) and your score line will grow here, one honest point per day.</div>
          )}
          <div className="legend"><span>● Finalized score</span><span>{trendPoints.length} finalized day{trendPoints.length === 1 ? '' : 's'}</span></div>
        </Card>
        <Card title="Focus — last 7 days" sub={`Daily target ${target} minutes · total this week ${fmtMinutes(weekTotal)}`}>
          {weekTotal > 0 ? (
            <BarsChart bars={focusWeek.map((d) => ({ label: weekdayShort(d.date), value: d.minutes }))} target={target} />
          ) : (
            <div className="chart-empty">No focus sessions in the last 7 days yet. Start the timer on the Focus page and this chart fills itself.</div>
          )}
        </Card>
      </div>

      <div className="grid">
        <Card title="Today's prayers">
          {PRAYERS.map((p) => {
            const row = prayers.find((x) => x.prayer === p);
            return (
              <div className="action-row" key={p}>
                <span className="icon-chip tone-teal"><I name="moon" size={21} /></span>
                <Toggle label={p} hint={row?.is_qaza ? 'Marked as qaza' : undefined}
                  on={Boolean(row?.performed)} onToggle={() => togglePrayer(p)} />
              </div>
            );
          })}
          <button className="btn ghost small" onClick={() => go('prayer')}>Prayer + Qaza details →</button>
        </Card>
        <Card title="Today's habits">
          {habits.length === 0 ? <p className="muted">No active habits yet.</p> : habits.map((h, i) => (
            <div className="action-row" key={h.id}>
              <span className={`icon-chip ${TONES[i % TONES.length]}`}><I name="check" size={21} /></span>
              <Toggle label={h.name} hint={h.slot && h.slot !== 'any' ? h.slot : undefined}
                on={Boolean(habitLogs.some((l) => l.habit_id === h.id && l.done))} onToggle={() => toggleHabit(h)} />
            </div>
          ))}
          <button className="btn ghost small" onClick={() => go('habits')}>Habits + Grooming →</button>
        </Card>
      </div>
    </div>
  );
}
