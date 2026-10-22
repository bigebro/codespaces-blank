// src/lib/supabaseMaster.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://fcpwvualdbuakrwmqgmg.supabase.co";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// 🛡️ Зөвхөн Master Admin-д зориулсан тусдаа session санах ой
// Ингэснээр хэрэглэгчийн dashboard болон админ хоёр нэг хөтөч дээр зэрэг нээлттэй байсан ч бие биенийхээ эрхийг хэзээ ч дарж хутгахгүй!
export const supabaseMaster = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storageKey: 'operlink-master-admin-session',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  }
});