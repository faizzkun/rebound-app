// Asia/Karachi is the default display timezone for this app.
export const TZ = 'Asia/Karachi';

/** Today as YYYY-MM-DD in Asia/Karachi. */
export function todayKarachi(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

/** Pretty date label in Asia/Karachi, e.g. "Mon, 26 Oct 2026". */
export function prettyDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Intl.DateTimeFormat('en-GB', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
    .format(new Date(Date.UTC(y, m - 1, d, 12)));
}

/** Minutes between two HH:MM times, crossing midnight when end < start. Null when end is missing. */
export function hhmmDuration(start: string, end: string | null): number | null {
  if (!end) return null;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let mins = eh * 60 + em - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60;
  return mins;
}

export function fmtMinutes(mins: number | null): string {
  if (mins === null || mins === undefined) return '—';
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/** Minutes between two ISO timestamps (focus sessions). Null when end is missing. */
export function isoDuration(start: string, end: string | null): number | null {
  if (!end) return null;
  return Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000));
}

/** Find overlapping completed focus sessions; returns pairs of ids. */
export function findOverlaps(sessions: { id: string; start_at: string; end_at: string | null }[]): [string, string][] {
  const done = sessions.filter((s) => s.end_at);
  const pairs: [string, string][] = [];
  for (let i = 0; i < done.length; i++) {
    for (let j = i + 1; j < done.length; j++) {
      const a = done[i];
      const b = done[j];
      if (new Date(a.start_at) < new Date(b.end_at as string) && new Date(b.start_at) < new Date(a.end_at as string)) {
        pairs.push([a.id, b.id]);
      }
    }
  }
  return pairs;
}
