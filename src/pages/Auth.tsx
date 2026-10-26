import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Card, Field, Err, Ok, errText, Seg } from '../components/ui';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setOk(null); setBusy(true);
    try {
      if (mode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
        if (error) throw error;
        setOk('Password reset email sent. Check your inbox.');
      } else if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
        if (error) throw error;
        setOk('Account created. If email confirmation is on, confirm your email, then sign in.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (ex) { setErr(errText(ex)); } finally { setBusy(false); }
  }

  return (
    <div style={{ maxWidth: 460, margin: '40px auto' }}>
      <Card title="REBOUND" sub="Missed today? Rebound tomorrow. This is your private discipline OS — sign in to continue. No data here is public.">
        <Err msg={err} /><Ok msg={ok} />
        <Seg label="What do you want to do?" value={mode} onChange={(v) => setMode(v as 'signin' | 'signup' | 'reset')} options={[
          { value: 'signin', label: 'Sign in' }, { value: 'signup', label: 'Create account' }, { value: 'reset', label: 'Forgot password' },
        ]} />
        <form onSubmit={submit} className="form-stack">
          <Field label="Email"><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <Field label="Password"><input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
          <button className="btn block" disabled={busy} type="submit">
            {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset email'}
          </button>
        </form>
        <p className="muted">Only your own account can see or change your records. Row-level security enforces this in the database — there is no shared or admin view in this app.</p>
      </Card>
    </div>
  );
}
