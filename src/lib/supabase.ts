import { createClient } from '@supabase/supabase-js';

// Env-only configuration. No key or URL is hardcoded, printed, or committed.
// Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (or the legacy
// VITE_SUPABASE_ANON_KEY fallback) in the deployment environment.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined;

export const SUPABASE_CONFIGURED = Boolean(url && key);
export const supabase = createClient(url ?? 'https://placeholder.supabase.co', key ?? 'placeholder');
