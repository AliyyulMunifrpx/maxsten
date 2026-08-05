// src/utils/uploadToSupabase.js
import { supabase } from "../application/supabase.js";
import path from "path";
export const uploadImageToSupabase = async (file, bucketName, folderName) => {
  const ext = path.extname(file.originalname);
  const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);

  // Contoh path hasil: "store-logos/logo-169123456789-123456789.png"
  const fileName = `${folderName}/${file.fieldname}-${uniqueSuffix}${ext}`;

  const { data, error } = await supabase.storage
    .from(bucketName) // <-- Menggunakan parameter dinamis
    .upload(fileName, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });
  if (error) {
    throw new Error(`Failed to upload image: ${error.message}`);
  }

  // Ambil public URL
  const { data: publicUrlData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(data.path); // data.path dari supabase sangat aman dipakai

  return {
    url: publicUrlData.publicUrl,
    fileName: fileName,
  };
};
