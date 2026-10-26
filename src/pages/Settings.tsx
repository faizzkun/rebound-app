import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { todayKarachi } from '../lib/date';
import { computeScore } from '../lib/score';
import { VISIBILITY_CATEGORIES } from '../lib/score';
import { Card, Field, Err, Ok, errText, PageHead, Toggle, Empty } from '../components/ui';
import type { Profile, UserPrefs, VisibilityRow, DailySummary } from '../lib/types';

export default function Settings({ userId }: { userId: string }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [prefs, setPrefs] = useState<UserPrefs | null>(null);
  const [visibility, setVisibility] = useState<VisibilityRow[]>([]);
  const [summaries, setSummaries] = useState<DailySummary[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [target, setTarget] = useState(240);
  const [junkDef, setJunkDef] = useState('');
  const [publicName, setPublicName] = useState('');
  const [publicBio, setPublicBio] = useState('');
  const [publicMission, setPublicMission] = useState('');

  async function load() {
    const [p, u, v, s, pp] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('user_preferences').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('public_visibility_settings').select('*').eq('owner_id', userId),
      supabase.from('daily_summaries').select('*').eq('owner_id', userId).order('summary_date', { ascending: false }).limit(14),
      supabase.from('public_profile_settings').select('*').eq('owner_id', userId).maybeSingle(),
    ]);
    const e = p.error || u.error || v.error || s.error || pp.error;
    if (e) { setErr(errText(e)); return; }
    setProfile(p.data as Profile | null); setPrefs(u.data as UserPrefs | null);
    setVisibility(v.data as VisibilityRow[]); setSummaries(s.data as DailySummary[]);
    if (p.data) { setDisplayName((p.data as Profile).display_name ?? ''); setTarget((p.data as Profile).focus_daily_target_minutes ?? 240); }
    if (u.data) setJunkDef((u.data as UserPrefs).junk_food_definition ?? '');
    if (pp.data) {
      const ppd = pp.data as { display_name: string | null; bio: string | null; mission: string | null };
      setPublicName(ppd.display_name ?? ''); setPublicBio(ppd.bio ?? ''); setPublicMission(ppd.mission ?? '');
    }
  }
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault(); setErr(null);
    const { error } = await supabase.from('profiles').upsert({ id: userId, display_name: displayName || null, timezone: 'Asia/Karachi', currency: 'PKR', focus_daily_target_minutes: target }, { onConflict: 'id' });
    if (error) { setErr(errText(error)); return; }
    const { error: e2 } = await supabase.from('user_preferences').upsert({ user_id: userId, junk_food_definition: junkDef || null }, { onConflict: 'user_id' });
    if (e2) { setErr(errText(e2)); return; }
    setOk('Profile + preferences saved.'); load();
  }
  async function savePublicProfile(e: React.FormEvent) {
    e.preventDefault(); setErr(null);
    const { error } = await supabase.from('public_profile_settings').upsert({ owner_id: userId, display_name: publicName || null, bio: publicBio || null, mission: publicMission || null }, { onConflict: 'owner_id' });
    if (error) { setErr(errText(error)); return; }
    setOk('Public profile text saved. This text is only shown when the matching visibility category is ON — see below.'); load();
  }
  async function toggleVisibility(category: string, on: boolean) {
    const { error } = await supabase.from('public_visibility_settings').upsert(
      { owner_id: userId, category, is_public: on, scope: {} },
      { onConflict: 'owner_id,category' },
    );
    if (error) setErr(errText(error)); else load();
  }

  async function finishDay() {
    setErr(null); setOk(null);
    const today = todayKarachi();
    try {
      const [pr, fo, sl, hd, hl, gr, wo, rd, jo] = await Promise.all([
        supabase.from('prayer_logs').select('performed').eq('owner_id', userId).eq('prayer_date', today),
        supabase.from('focus_sessions').select('start_at,end_at').eq('owner_id', userId).eq('session_date', today),
        supabase.from('sleep_sessions').select('wake_time').eq('owner_id', userId).eq('bed_date', today),
        supabase.from('habit_definitions').select('id').eq('owner_id', userId).eq('active', true),
        supabase.from('habit_logs').select('habit_id,done').eq('owner_id', userId).eq('log_date', today),
        supabase.from('grooming_logs').select('slot').eq('owner_id', userId).eq('log_date', today),
        supabase.from('workout_sessions').select('status').eq('owner_id', userId).eq('session_date', today).eq('status', 'completed').limit(1),
        supabase.from('reading_sessions').select('id').eq('owner_id', userId).eq('session_date', today).limit(1),
        supabase.from('journal_entries').select('id').eq('owner_id', userId).eq('entry_date', today).limit(1),
      ]);
      const first = [pr, fo, sl, hd, hl, gr, wo, rd, jo].find((r) => r.error)?.error;
      if (first) throw first;
      const focusMinutes = (fo.data as { start_at: string; end_at: string | null }[]).reduce((s, x) => s + (x.end_at ? Math.max(0, Math.round((new Date(x.end_at).getTime() - new Date(x.start_at).getTime()) / 60000)) : 0), 0);
      const habits = hd.data as { id: string }[];
      const habitLogs = hl.data as { habit_id: string | null; done: boolean }[];
      const result = computeScore({
        prayersPerformed: (pr.data as { performed: boolean }[]).filter((x) => x.performed).length,
        sleepWithWake: (sl.data as { wake_time: string | null }[]).some((x) => x.wake_time),
        focusMinutes, focusTarget: profile?.focus_daily_target_minutes ?? 240,
        workoutCompleted: ((wo.data as unknown[]) ?? []).length > 0,
        habitsApplicable: habits.length > 0,
        habitsAllDone: habits.length > 0 && habits.every((h) => habitLogs.some((l) => l.habit_id === h.id && l.done)),
        groomingBothSlots: (gr.data as { slot: string }[]).some((x) => x.slot === 'morning') && (gr.data as { slot: string }[]).some((x) => x.slot === 'evening'),
        readingDone: ((rd.data as unknown[]) ?? []).length > 0,
        journalDone: ((jo.data as unknown[]) ?? []).length > 0,
      });
      const { error } = await supabase.from('daily_summaries').upsert({
        owner_id: userId, summary_date: today,
        discipline_score: result.score, score_denominator: result.denominator,
        score_status: 'final', finalized_at: new Date().toISOString(),
      }, { onConflict: 'owner_id,summary_date' });
      if (error) throw error;
      await supabase.from('daily_records').upsert({ owner_id: userId, record_date: today, status: 'finalized' }, { onConflict: 'owner_id,record_date' });
      setOk(`Day finished. Final score: ${result.score === null ? '—' : `${Math.round(result.score * 100)}%`} (${result.completed}/${result.denominator}). This is now the final record for ${today} — tomorrow is a new rebound.`);
      load();
    } catch (ex) { setErr(errText(ex)); }
  }

  return (
    <div className="page-narrow">
      <PageHead title="Settings & Finish Day" tagline="End the day properly, then set the few things that shape the app: your focus target, your name, and — most importantly — what the public is allowed to see." />
      <Err msg={err} /><Ok msg={ok} />
      <Card title="Finish today">
        <p className="muted" style={{ marginTop: 0 }}>This locks today's score in as final. It appears on your trend chart afterwards. Unlogged things simply stay uncounted — finishing never rewrites history, it just closes the day.</p>
        <button className="btn block" onClick={finishDay}>Finish today ({todayKarachi()})</button>
        {summaries.length === 0 ? <Empty text="No finalized days yet. Your first Finish Day will appear here." /> : summaries.map((s) => (
          <div className="hrow" key={s.id}>
            <div className="hrow-main"><b>{s.summary_date}</b> · {s.score_status} · {s.discipline_score === null ? '—' : `${Math.round(Number(s.discipline_score) * 100)}%`} / {s.score_denominator ?? '—'}</div>
          </div>
        ))}
      </Card>
      <Card title="Your profile">
        <form onSubmit={saveProfile} className="form-stack">
          <Field label="Display name (private — only you see this)"><input value={displayName} onChange={(e) => setDisplayName(e.target.value)} /></Field>
          <Field label="Daily focus target (minutes)"><input type="number" min={0} value={target} onChange={(e) => setTarget(Number(e.target.value))} /></Field>
          <Field label="My junk-food definition"><input value={junkDef} onChange={(e) => setJunkDef(e.target.value)} /></Field>
          <button className="btn block" type="submit">Save profile</button>
        </form>
        <p className="muted">Timezone is Asia/Karachi and currency is PKR by default. Day boundary default is 04:00.</p>
      </Card>
      <Card title="Public profile text">
        <p className="muted" style={{ marginTop: 0 }}>These words are shown on the public site ONLY for categories you switch ON below. Everything else about you stays private by default.</p>
        <form onSubmit={savePublicProfile} className="form-stack">
          <Field label="Public display name"><input value={publicName} onChange={(e) => setPublicName(e.target.value)} /></Field>
          <Field label="Public bio"><textarea value={publicBio} onChange={(e) => setPublicBio(e.target.value)} /></Field>
          <Field label="Mission"><textarea value={publicMission} onChange={(e) => setPublicMission(e.target.value)} /></Field>
          <button className="btn block" type="submit">Save public profile</button>
        </form>
      </Card>
      <Card title="What can the public see?">
        <div className="notebox">OFF means <b>gone from the public site completely</b> — not hidden, not blurred: the public data source excludes that category entirely. And some things are <b>never public no matter what</b>: money, journal content, private tracking, messages, credentials, personal details.</div>
        {VISIBILITY_CATEGORIES.map((c) => {
          const row = visibility.find((v) => v.category === c);
          const on = Boolean(row?.is_public);
          return (
            <Toggle key={c} label={c.replace('_', ' ')} hint={on ? 'Anyone can see this' : 'Only you can see this'}
              on={on} onToggle={() => toggleVisibility(c, !on)} />
          );
        })}
        <p className="muted">Everything starts PRIVATE (OFF) until you switch it on.</p>
      </Card>
    </div>
  );
}
