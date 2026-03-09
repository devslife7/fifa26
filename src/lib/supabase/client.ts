import { createBrowserClient } from '@supabase/ssr';

const PLACEHOLDER = 'https://your-project.supabase.co';

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return !!url && url !== PLACEHOLDER && url.startsWith('https://');
}

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
