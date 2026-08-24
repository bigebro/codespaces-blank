import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://fcpwvualdbuakrwmqgmg.supabase.co";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjcHd2dWFsZGJ1YWtyd21xZ21nIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDE4MDQzOCwiZXhwIjoyMDk5NzU2NDM4fQ.iDX_3sL-Sk1Z5oK2zSvW32saZBoY5f5f4XBu_dTQA-U";

// Create a single global instance of Supabase with fixed syntax 
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
  persistSession: true,      
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});