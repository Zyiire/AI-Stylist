import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Null when Supabase env vars are absent (e.g. local dev without auth) —
// the app runs with auth features disabled instead of crashing.
export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null;
