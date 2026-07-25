import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

// Mengecek apakah variabel env sudah terbaca
if (!supabaseUrl || !supabaseKey) {
  throw new Error("SUPABASE_URL atau SUPABASE_ANON_KEY belum di-set di file .env!");
}

// Membuat instance Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey);
export const supabaseAdmin = createClient(
 supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY // <--- Pake kunci rahasia
);