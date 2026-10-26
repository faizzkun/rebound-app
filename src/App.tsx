import { useEffect, useState } from 'react';
import { supabase, SUPABASE_CONFIGURED } from './lib/supabase';
import Auth from './pages/Auth';
import CommandCenter from './pages/CommandCenter';
import PrayerQaza from './pages/PrayerQaza';
import Sleep from './pages/Sleep';
import Reading from './pages/Reading';
import Workout from './pages/Workout';
import Focus from './pages/Focus';
import Habits from './pages/Habits';
import SelfControl from './pages/SelfControl';
import Journal from './pages/Journal';
import Finance from './pages/Finance';
import Search from './pages/Search';
import Settings from './pages/Settings';

const TABS = [
  { id: 'home', label: 'Command Center' },
  { id: 'prayer', label: 'Prayer + Qaza' },
  { id: 'sleep', label: 'Sleep' },
  { id: 'reading', label: 'Reading' },
  { id: 'workout', label: 'Workout' },
  { id: 'focus', label: 'Focus' },
  { id: 'habits', label: 'Habits + Food' },
  { id: 'private', label: 'Private' },
  { id: 'journal', label: 'Journal + Events' },
  { id: 'finance', label: 'Finance' },
  { id: 'search', label: 'Search' },
  { id: 'settings', label: 'Settings + Finish Day' },
] as const;

export default function App() {
  const [tab, setTab] = useState<string>('home');
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    if (!SUPABASE_CONFIGURED) { setLoading(false); return; }
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user.id ?? null);
      setEmail(data.session?.user.email ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user.id ?? null);
      setEmail(session?.user.email ?? null);
    });
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { sub.subscription.unsubscribe(); window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  if (!SUPABASE_CONFIGURED) {
    return (
      <div className="main">
        <div className="card">
          <h2>REBOUND is not configured yet</h2>
          <p className="muted">Set the environment variables VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (or VITE_SUPABASE_ANON_KEY) in the deployment environment, then rebuild. No key is stored in this code.</p>
        </div>
      </div>
    );
  }
  if (loading) return <div className="main"><p className="muted">Loading…</p></div>;
  if (!userId) return <div className="main"><Auth /></div>;

  return (
    <div>
      {!online ? <div className="offline">You are offline — this app is online-only: changes cannot be saved until you are back online. Do not close the tab with unsaved form input.</div> : null}
      <header className="topbar">
        <img src="/icon.svg" alt="" width="36" height="36" style={{ borderRadius: 9 }} />
        <div>
          <div className="brand">REBOUND<span>.</span></div>
          <div className="tagline">Missed today? Rebound tomorrow.</div>
        </div>
        <div style={{ marginLeft: 'auto' }} className="row">
          <span className="muted">{email}</span>
          <button className="btn ghost small" onClick={async () => { await supabase.auth.signOut(); setTab('home'); }}>Sign out</button>
        </div>
      </header>
      <nav className="nav">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </nav>
      <main className="main">
        {tab === 'home' && <CommandCenter userId={userId} go={setTab} />}
        {tab === 'prayer' && <PrayerQaza userId={userId} />}
        {tab === 'sleep' && <Sleep userId={userId} />}
        {tab === 'reading' && <Reading userId={userId} />}
        {tab === 'workout' && <Workout userId={userId} />}
        {tab === 'focus' && <Focus userId={userId} />}
        {tab === 'habits' && <Habits userId={userId} />}
        {tab === 'private' && <SelfControl userId={userId} />}
        {tab === 'journal' && <Journal userId={userId} />}
        {tab === 'finance' && <Finance userId={userId} />}
        {tab === 'search' && <Search userId={userId} />}
        {tab === 'settings' && <Settings userId={userId} />}
      </main>
    </div>
  );
}
