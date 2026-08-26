import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://fcpwvualdbuakrwmqgmg.supabase.co";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Create a single global instance of Supabase with fixed syntax 
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,      
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});