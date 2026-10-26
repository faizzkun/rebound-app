/* Rebound SVG icon set — one stroke style, currentColor, no emoji, no images. */

export type IconName =
  | 'home' | 'search' | 'moon' | 'bed' | 'book' | 'dumbbell' | 'clock' | 'check'
  | 'lock' | 'pen' | 'wallet' | 'gear' | 'plus' | 'flame' | 'calendar' | 'chart' | 'user'
  | 'menu' | 'sun';

const PATHS: Record<IconName, React.ReactNode> = {
  home: (<><path d="M3 11.5 12 3.5l9 8" /><path d="M5.5 10v10h13V10" /><path d="M10 20v-5.5h4V20" /></>),
  search: (<><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></>),
  moon: (<><path d="M20 13.2A8.2 8.2 0 1 1 10.8 4a6.6 6.6 0 0 0 9.2 9.2z" /><path d="M18.5 3.5l.6 1.5 1.5.6-1.5.6-.6 1.5-.6-1.5-1.5-.6 1.5-.6z" /></>),
  bed: (<><path d="M3 18v-7" /><path d="M3 13.5h18V18" /><path d="M5.5 13.5v-2.5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v2.5" /><path d="M3 18h18" /></>),
  book: (<><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5z" /><path d="M4 21.5V4.5" /><path d="M9 7h6" /></>),
  dumbbell: (<><path d="M6.5 7v10" /><path d="M3.5 9.5v5" /><path d="M17.5 7v10" /><path d="M20.5 9.5v5" /><path d="M6.5 12h11" /></>),
  clock: (<><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3.2 2" /></>),
  check: (<><circle cx="12" cy="12" r="8.5" /><path d="M8 12.3l2.6 2.6L16.5 9" /></>),
  lock: (<><rect x="5" y="11" width="14" height="9.5" rx="2.5" /><path d="M8 11V7.5a4 4 0 0 1 8 0V11" /><circle cx="12" cy="15.5" r="1.2" /></>),
  pen: (<><path d="M4 20l1.2-4.2L16.8 4.2a2.1 2.1 0 0 1 3 3L8.2 18.8z" /><path d="M14.5 6.5l3 3" /></>),
  wallet: (<><rect x="3" y="6" width="18" height="13" rx="3" /><path d="M3 10h18" /><path d="M16 15h2.5" /></>),
  gear: (<><circle cx="12" cy="12" r="3.2" /><path d="M12 2.8v2.6M12 18.6v2.6M2.8 12h2.6M18.6 12h2.6M5.4 5.4l1.8 1.8M16.8 16.8l1.8 1.8M18.6 5.4l-1.8 1.8M7.2 16.8l-1.8 1.8" /></>),
  plus: (<><path d="M12 5v14M5 12h14" /></>),
  flame: (<><path d="M12 3c1.2 3.4 6 5.6 6 10.5a6 6 0 0 1-12 0C6 10 9.5 7.5 12 3z" /><path d="M12 21c1.6-1.6 2.6-3 2.6-4.6a2.6 2.6 0 0 0-5.2 0c0 1 .5 2 1 3-.3-1 .3-1.8.9-2.2.2 1.5.8 2.8 1.7 3.8z" /></>),
  calendar: (<><rect x="3" y="5" width="18" height="16" rx="2.5" /><path d="M3 9.5h18M8 2.8v4M16 2.8v4M8 14.5h.01M12 14.5h.01M16 14.5h.01M8 18h.01M12 18h.01" /></>),
  chart: (<><path d="M4 20V11M10 20V4M16 20v-7M22 20H2" /></>),
  user: (<><circle cx="12" cy="8" r="4" /><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" /></>),
  menu: (<><path d="M4 7h16M4 12h16M4 17h10" /></>),
  sun: (<><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5 5l1.8 1.8M17.2 17.2 19 19M19 5l-1.8 1.8M6.8 17.2 5 19" /></>),
};

export function I({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}
