import { createClient } from "@supabase/supabase-js";

// These values come from your Supabase project dashboard:
// Project Settings → API → Project URL / anon public key.
//
// They're read from environment variables (see .env at the project root)
// rather than hardcoded here, so the real keys never get committed to
// GitHub by accident.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
