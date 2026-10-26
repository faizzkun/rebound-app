import { useEffect, useState } from 'react';
import { supabase, SUPABASE_CONFIGURED } from './lib/supabase';
import { todayKarachi, prettyDate } from './lib/date';
import { I, type IconName } from './components/icons';
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

const GROUPS: { label: string; items: { id: string; label: string; ico: IconName }[] }[] = [
  { label: 'Overview', items: [
    { id: 'home', label: 'Command Center', ico: 'home' },
    { id: 'search', label: 'Search', ico: 'search' },
  ] },
  { label: 'Track', items: [
    { id: 'prayer', label: 'Prayer + Qaza', ico: 'moon' },
    { id: 'sleep', label: 'Sleep', ico: 'bed' },
    { id: 'reading', label: 'Reading', ico: 'book' },
    { id: 'workout', label: 'Workout', ico: 'dumbbell' },
    { id: 'focus', label: 'Focus', ico: 'clock' },
    { id: 'habits', label: 'Habits + Food', ico: 'check' },
    { id: 'private', label: 'Private', ico: 'lock' },
  ] },
  { label: 'Manage', items: [
    { id: 'journal', label: 'Journal + Events', ico: 'pen' },
    { id: 'finance', label: 'Finance', ico: 'wallet' },
    { id: 'settings', label: 'Settings + Finish Day', ico: 'gear' },
  ] },
];
const ALL = GROUPS.flatMap((g) => g.items);
const BOTTOM: { id: string; label: string; ico: IconName }[] = [
  { id: 'home', label: 'Home', ico: 'home' },
  { id: 'prayer', label: 'Prayer', ico: 'moon' },
  { id: 'focus', label: 'Focus', ico: 'clock' },
  { id: 'habits', label: 'Habits', ico: 'check' },
];

export default function App() {
  const [tab, setTab] = useState<string>('home');
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(navigator.onLine);
  const [drawer, setDrawer] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('rebound-theme') === 'dark' ? 'dark' : 'light'));

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('rebound-theme', theme);
  }, [theme]);

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

  const go = (t: string) => { setTab(t); setDrawer(false); window.scrollTo({ top: 0 }); };
  const activeLabel = ALL.find((t) => t.id === tab)?.label ?? 'Command Center';
  const initial = (email ?? 'R').trim().charAt(0).toUpperCase();

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
    <div className="shell">
      {drawer ? <button className="backdrop show" aria-label="Close menu" onClick={() => setDrawer(false)} /> : null}
      <aside className={`sidebar${drawer ? ' open' : ''}`}>
        <div className="side-brand">
          <div className="side-logo">R<i>.</i></div>
          <div>
            <div className="side-name">REBOUND<span>.</span></div>
            <div className="side-tag">Missed today? Rebound tomorrow.</div>
          </div>
        </div>
        {GROUPS.map((g) => (
          <nav className="side-group" key={g.label}>
            <div className="side-label">{g.label}</div>
            {g.items.map((t) => (
              <button key={t.id} className={`side-item${tab === t.id ? ' active' : ''}`} onClick={() => go(t.id)}>
                <span className="side-ico"><I name={t.ico} size={19} /></span>{t.label}
              </button>
            ))}
          </nav>
        ))}
        <div className="side-foot">
          <div className="side-user">
            <div className="avatar">{initial}</div>
            <div className="side-email">{email}</div>
          </div>
          <button className="btn ghost small" style={{ width: '100%' }} onClick={async () => { await supabase.auth.signOut(); go('home'); }}>Sign out</button>
        </div>
      </aside>

      <div className="content">
        {!online ? <div className="offline">You are offline — this app is online-only: changes cannot be saved until you are back online. Do not close the tab with unsaved form input.</div> : null}
        <header className="topbar">
          <button className="icon-btn menu-btn" aria-label="Open menu" onClick={() => setDrawer(true)}><I name="menu" size={20} /></button>
          <div>
            <div className="top-title">{activeLabel}</div>
            <div className="top-date">{prettyDate(todayKarachi())} · Asia/Karachi</div>
          </div>
          <button className="search-btn" onClick={() => go('search')}><span style={{ display: 'inline-flex', verticalAlign: 'middle' }}><I name="search" size={15} /></span> Search</button>
          <button className="theme-btn" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
            <span style={{ display: 'inline-flex', verticalAlign: 'middle' }}><I name={theme === 'light' ? 'moon' : 'sun'} size={15} /></span> <span>{theme === 'light' ? 'Dark' : 'Light'}</span>
          </button>
        </header>
        <main className="main">
          {tab === 'home' && <CommandCenter userId={userId} go={go} />}
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
        <nav className="bottomnav">
          {BOTTOM.map((t) => (
            <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => go(t.id)}>
              <span className="bnav-ico"><I name={t.ico} size={20} /></span>{t.label}
            </button>
          ))}
          <button onClick={() => setDrawer(true)}><span className="bnav-ico"><I name="menu" size={20} /></span>More</button>
        </nav>
        <button className="fab" aria-label="Start focus" onClick={() => go('focus')}><I name="plus" size={26} /></button>
      </div>
    </div>
  );
}
