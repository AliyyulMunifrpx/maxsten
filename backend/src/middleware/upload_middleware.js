import multer from "multer";
import path from "path";

// 1. Setting tempat penyimpanan dan nama file
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Foto bakal disimpen di folder public/uploads
    cb(null, "public/uploads");
  },
  filename: function (req, file, cb) {
    // Biar namanya unik dan nggak bentrok, kita tambahin tanggal
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname); // Ngambil ekstensi (misal: .png, .jpg)
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});

// 2. Filter khusus gambar (Biar hacker nggak nge-upload script/virus)
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Hanya file gambar yang diperbolehkan!"), false);
  }
};

// 3. Export middleware-nya (Maksimal ukuran 2MB)
export const uploadLogo = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 },
});
