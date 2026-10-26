import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { todayKarachi, isoDuration, fmtMinutes, findOverlaps } from '../lib/date';
import { Card, Field, Err, Ok, errText, PageHead, ProgressBar, Details, Empty } from '../components/ui';
import type { FocusSession, Profile } from '../lib/types';

export default function Focus({ userId }: { userId: string }) {
  const [rows, setRows] = useState<FocusSession[]>([]);
  const [target, setTarget] = useState(240);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [warn, setWarn] = useState<string | null>(null);
  const [task, setTask] = useState('');
  const [runningId, setRunningId] = useState<string | null>(null);
  const [manualStart, setManualStart] = useState('');
  const [manualEnd, setManualEnd] = useState('');
  const [manualTask, setManualTask] = useState('');
  const [output, setOutput] = useState('');
  const [learned, setLearned] = useState('');

  async function load() {
    const [f, p] = await Promise.all([
      supabase.from('focus_sessions').select('*').eq('owner_id', userId).order('start_at', { ascending: false }).limit(50),
      supabase.from('profiles').select('focus_daily_target_minutes').eq('id', userId).maybeSingle(),
    ]);
    if (f.error) { setErr(errText(f.error)); return; }
    setRows(f.data as FocusSession[]);
    setRunningId(((f.data as FocusSession[]) ?? []).find((r) => !r.end_at)?.id ?? null);
    if (p.data) setTarget((p.data as Profile).focus_daily_target_minutes ?? 240);
  }
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function overlapsWith(start: string, end: string | null): boolean {
    if (!end) return false;
    return rows.some((r) => r.end_at && new Date(start) < new Date(r.end_at) && new Date(r.start_at) < new Date(end));
  }

  async function startTimer() {
    setErr(null); setWarn(null);
    const { data, error } = await supabase.from('focus_sessions').insert({ owner_id: userId, session_date: todayKarachi(), start_at: new Date().toISOString(), project_task: task || null, entry_kind: 'timed' }).select().single();
    if (error) { setErr(errText(error)); return; }
    setRunningId(data.id); setOk('Timer started.'); load();
  }
  async function stopTimer() {
    if (!runningId) return;
    const row = rows.find((r) => r.id === runningId);
    const { error } = await supabase.from('focus_sessions').update({ end_at: new Date().toISOString(), output: output || row?.output || null, learned: learned || row?.learned || null }).eq('id', runningId);
    if (error) { setErr(errText(error)); return; }
    setRunningId(null); setOk('Timer stopped and saved.'); load();
  }
  async function addManual(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setWarn(null); setOk(null);
    if (manualEnd && manualStart >= manualEnd) { setErr('End must be after start.'); return; }
    if (overlapsWith(manualStart, manualEnd)) {
      setWarn('Warning: this manual entry overlaps an existing session. It is still saved, but the overlap is flagged on the Command Center — do not double-count it.');
    }
    const { error } = await supabase.from('focus_sessions').insert({
      owner_id: userId, session_date: manualStart.slice(0, 10), start_at: manualStart, end_at: manualEnd || null,
      project_task: manualTask || null, entry_kind: 'manual',
    });
    if (error) { setErr(errText(error)); return; }
    setOk('Manual entry saved.'); load();
  }
  async function del(id: string) {
    const { error } = await supabase.from('focus_sessions').delete().eq('id', id);
    if (error) setErr(errText(error)); else load();
  }

  const todayRows = rows.filter((r) => r.session_date === todayKarachi());
  const todayMinutes = todayRows.reduce((s, r) => s + (isoDuration(r.start_at, r.end_at) ?? 0), 0);
  const overlaps = findOverlaps(todayRows);

  return (
    <div className="page-narrow">
      <PageHead title="Deep Work" tagline="One job here: protect uninterrupted work time. Start the timer, do the work, stop it. Everything else on this page is secondary." />
      <Err msg={err} /><Ok msg={ok} />
      {warn ? <div className="warn">{warn}</div> : null}
      <Card title="Today's focus">
        <div className="stat-value" style={{ margin: '2px 0' }}>{fmtMinutes(todayMinutes)} <span style={{ fontSize: 16, color: 'var(--muted)' }}>/ {target} min target</span></div>
        <ProgressBar value={target > 0 ? todayMinutes / target : 0} good={todayMinutes >= target} />
        {overlaps.length > 0 ? <div className="warn" style={{ marginTop: 12 }}>{overlaps.length} overlapping session pair(s) today. Review and delete the duplicate below.</div> : null}
        {runningId ? (
          <div style={{ marginTop: 16 }}>
            <p className="muted">Timer running… when you stop, note what came out of it.</p>
            <div className="form-stack">
              <Field label="What did you produce?"><input value={output} onChange={(e) => setOutput(e.target.value)} /></Field>
              <Field label="What did you learn?"><input value={learned} onChange={(e) => setLearned(e.target.value)} /></Field>
              <button className="btn block" onClick={stopTimer}>Stop timer</button>
            </div>
          </div>
        ) : (
          <div className="form-stack" style={{ marginTop: 16 }}>
            <Field label="What are you working on?"><input value={task} onChange={(e) => setTask(e.target.value)} placeholder="e.g. Client website, course chapter…" /></Field>
            <button className="btn block" onClick={startTimer}>Start timer</button>
          </div>
        )}
        <p className="muted" style={{ marginTop: 12 }}>Change the daily target in Settings → Profile (default 4 hours). Overlapping sessions are flagged, never silently double-counted.</p>
      </Card>
      <Details title="Add work done without the timer (manual entry)">
        <form onSubmit={addManual} className="form-stack">
          <Field label="Start"><input type="datetime-local" required value={manualStart} onChange={(e) => setManualStart(e.target.value)} /></Field>
          <Field label="End"><input type="datetime-local" value={manualEnd} onChange={(e) => setManualEnd(e.target.value)} /></Field>
          <Field label="Task / project"><input value={manualTask} onChange={(e) => setManualTask(e.target.value)} /></Field>
          <button className="btn block" type="submit">Save manual entry</button>
        </form>
      </Details>
      <Card title="Recent sessions">
        {rows.length === 0 ? <Empty text="No focus sessions yet. Start your first timer above." /> : rows.map((r) => (
          <div className="hrow" key={r.id}>
            <div className="hrow-main"><b>{r.session_date}</b> · {r.project_task ?? '(no task)'}</div>
            <div className="hrow-meta">{r.entry_kind === 'timed' ? 'Timer' : 'Manual'} · {r.end_at ? fmtMinutes(isoDuration(r.start_at, r.end_at)) : 'running…'}</div>
            <div className="hrow-actions"><button className="txt-danger" onClick={() => del(r.id)}>Delete</button></div>
          </div>
        ))}
      </Card>
    </div>
  );
}
