import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  plugins: [
    react(),
    tailwindcss(),

    VitePWA({
      registerType: "autoUpdate",
      devOptions: {
        enabled: true,
      },
      // Menyertakan aset utama yang ada di folder public kamu
      includeAssets: [],
      manifest: {
        name: "Maxsten",
        short_name: "AntreanApp",
        description: "Sistem Manajemen Antrean Lokal",
        theme_color: "#181818", // Warna biru tema utama
        background_color: "#181818", // Warna latar belakang splash screen (wajib ada untuk Android)
        display: "standalone", // Membuat aplikasi terbuka penuh tanpa navigasi browser URL
        icons: [
          {
            // Disesuaikan dengan folder /icon/ dan nama file pakai spasi milikmu
            src: "/icon/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable", // Menandakan ikon ini bisa digunakan untuk splash screen dan ikon aplikasi
          },
          {
            src: "/icon/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ],
});
