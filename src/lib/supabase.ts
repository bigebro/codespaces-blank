import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Supabase environment variables are missing! " +
    "Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY " +
    "are defined in your env setup."
  );
}

// Create a single global instance of Supabase with fixed syntax 
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,      
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});