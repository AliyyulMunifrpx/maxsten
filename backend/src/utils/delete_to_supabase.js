import { supabase } from "../application/supabase.js";

export const deleteImageFromSupabase = async (fileName, bucketName) => {
  const { data, error } = await supabase.storage
    .from(bucketName) // <-- Menggunakan parameter dinamis
    .remove([fileName]);

  if (error) {
    console.error("Gagal menghapus gambar di Supabase (zombie file):", error);
  }
};
