import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ervfizmcgcatlwynupbt.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_IJTTMi5K-ariqsakvSrYiA_LmeINzor";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
