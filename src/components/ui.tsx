import type { ReactNode } from 'react';

export function Card({ title, children, sub }: { title?: string; sub?: string; children: ReactNode }) {
  return (
    <section className="card">
      {title ? <h2>{title}</h2> : null}
      {sub ? <p className="muted" style={{ marginTop: 0 }}>{sub}</p> : null}
      {children}
    </section>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="field"><label>{label}</label>{children}</div>;
}

export function Err({ msg }: { msg: string | null }) {
  return msg ? <div className="err">{msg}</div> : null;
}

export function Ok({ msg }: { msg: string | null }) {
  return msg ? <div className="ok">{msg}</div> : null;
}

export function errText(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === 'object' && e !== null && 'message' in e) return String((e as { message: unknown }).message);
  return 'Something went wrong. Please try again.';
}

/* ---- Dashboard visuals: pure SVG, no chart dependency ---- */

export function Ring({ value, size = 132, label }: { value: number | null; size?: number; label: string }) {
  const r = (size - 16) / 2;
  const c = 2 * Math.PI * r;
  const v = value === null ? 0 : Math.max(0, Math.min(1, value));
  return (
    <div style={{ textAlign: 'center' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth="11" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--accent)" strokeWidth="11" strokeLinecap="round"
          strokeDasharray={`${c * v} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
        <text x={size / 2} y={size / 2 - 2} textAnchor="middle" dominantBaseline="middle" fontSize="26" fontWeight="800" fill="var(--text)">
          {value === null ? '—' : `${Math.round(value * 100)}%`}
        </text>
        <text x={size / 2} y={size / 2 + 22} textAnchor="middle" fontSize="11" fill="var(--muted)">score</text>
      </svg>
    </div>
  );
}

export function ProgressBar({ value, good }: { value: number; good?: boolean }) {
  const v = Math.max(0, Math.min(1, value));
  return <div className={`bar${good ? ' good' : ''}`}><div style={{ width: `${Math.round(v * 100)}%` }} /></div>;
}

export function Stat({ label, value, sub, children }: { label: string; value: string; sub: string; children?: ReactNode }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-sub">{sub}</div>
      {children}
    </div>
  );
}

/** Line/area trend chart. values are 0..1 fractions; labels shown for first/last/middle. */
export function TrendChart({ points }: { points: { label: string; value: number }[] }) {
  const w = 560, h = 170, pad = 14;
  const xs = points.map((_, i) => pad + (i * (w - pad * 2)) / Math.max(1, points.length - 1));
  const ys = points.map((p) => h - pad - Math.max(0, Math.min(1, p.value)) * (h - pad * 2 - 18));
  const line = points.map((_, i) => `${i === 0 ? 'M' : 'L'}${xs[i].toFixed(1)},${ys[i].toFixed(1)}`).join(' ');
  const area = `${line} L${xs[xs.length - 1].toFixed(1)},${h - pad} L${xs[0].toFixed(1)},${h - pad} Z`;
  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" role="img" aria-label="Score trend">
        <line x1={pad} x2={w - pad} y1={h - pad} y2={h - pad} stroke="var(--line)" />
        <path d={area} fill="var(--accent)" opacity="0.16" />
        <path d={line} fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={xs[i]} cy={ys[i]} r="4.5" fill="var(--surface)" stroke="var(--accent)" strokeWidth="2.5" />
            {(i === 0 || i === points.length - 1) ? (
              <text x={xs[i]} y={h - 1} textAnchor="middle" fontSize="11" fill="var(--muted)">{p.label}</text>
            ) : null}
          </g>
        ))}
      </svg>
    </div>
  );
}

/** Vertical bar chart with an optional dashed target line. */
export function BarsChart({ bars, target }: { bars: { label: string; value: number }[]; target?: number }) {
  const w = 560, h = 170, pad = 14;
  const max = Math.max(60, target ?? 0, ...bars.map((b) => b.value));
  const bw = (w - pad * 2) / bars.length;
  const yFor = (v: number) => h - pad - 18 - (v / max) * (h - pad * 2 - 18);
  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" role="img" aria-label="Weekly bars">
        {target !== undefined ? (
          <g>
            <line x1={pad} x2={w - pad} y1={yFor(target)} y2={yFor(target)} stroke="var(--danger)" strokeDasharray="5 5" strokeWidth="1.5" />
            <text x={w - pad} y={yFor(target) - 5} textAnchor="end" fontSize="11" fill="var(--danger)">target {target}m</text>
          </g>
        ) : null}
        {bars.map((b, i) => {
          const bh = Math.max(0, (b.value / max) * (h - pad * 2 - 18));
          const x = pad + i * bw + bw * 0.22;
          return (
            <g key={i}>
              <rect x={x} y={h - pad - 18 - bh} width={bw * 0.56} height={bh} rx="6" fill={b.value > 0 ? 'var(--accent)' : 'var(--line)'} />
              <text x={x + bw * 0.28} y={h - pad - 18 - bh - 5} textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--text)">{b.value > 0 ? b.value : ''}</text>
              <text x={x + bw * 0.28} y={h - 1} textAnchor="middle" fontSize="11" fill="var(--muted)">{b.label}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ---- v3 UX kit: one clear action per screen, no tiny checkboxes ---- */

export function PageHead({ title, tagline, action }: { title: string; tagline: string; action?: ReactNode }) {
  return (
    <div className="pagehead">
      <div>
        <h1>{title}</h1>
        <p>{tagline}</p>
      </div>
      {action ? <div className="pagehead-action">{action}</div> : null}
    </div>
  );
}

/** Big tappable on/off card — replaces the tiny tick checkbox everywhere.
    The whole card is the target; the switch slides and the card lights up. */
export function Toggle({ on, onToggle, label, hint }: { on: boolean; onToggle: () => void; label: string; hint?: string }) {
  return (
    <button type="button" className={`toggle${on ? ' on' : ''}`} onClick={onToggle} role="switch" aria-checked={on}>
      <span className="toggle-track"><span className="toggle-knob" /></span>
      <span className="toggle-text">
        <span className="toggle-label">{label}</span>
        {hint ? <span className="toggle-hint">{hint}</span> : null}
      </span>
      <span className={`toggle-state${on ? ' on' : ''}`}>{on ? 'Done' : 'To do'}</span>
    </button>
  );
}

/** Segmented choice — replaces dropdowns for small option sets. */
export function Seg({ label, options, value, onChange }: { label: string; options: { value: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="field">
      <label>{label}</label>
      <div className="seg">
        {options.map((o) => (
          <button key={o.value} type="button" className={value === o.value ? 'active' : ''} onClick={() => onChange(o.value)}>{o.label}</button>
        ))}
      </div>
    </div>
  );
}

/** Progressive disclosure: secondary stuff hides behind one tap. */
export function Details({ title, children, defaultOpen }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <details className="details" open={defaultOpen}>
      <summary>{title}</summary>
      <div className="details-body">{children}</div>
    </details>
  );
}

export function Empty({ text, actionLabel, onAction }: { text: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <div className="empty">
      <p>{text}</p>
      {actionLabel && onAction ? <button className="btn ghost small" onClick={onAction}>{actionLabel}</button> : null}
    </div>
  );
}

/** Small on/off chip for secondary flags (Jamaat / Late / Qaza). Lime when on. */
export function Chip({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  return (
    <button type="button" className={`chip${on ? ' on' : ''}`} onClick={onToggle} role="switch" aria-checked={on}>{label}</button>
  );
}
