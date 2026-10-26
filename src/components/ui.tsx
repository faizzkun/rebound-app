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
