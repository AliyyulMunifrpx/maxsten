# Maxsten API

Backend API untuk **Maxsten** — sistem manajemen antrean untuk pelaku UMKM di Indonesia. Penjual mengelola toko, menu, dan antrean pesanan secara real-time; pembeli bisa melihat menu toko dan memesan tanpa perlu membuat akun.

Dibangun dengan Node.js/Express, Prisma ORM, dan Supabase Auth, dengan update real-time lewat Socket.IO.

## ⚠️ Penting: Jalankan Secara Lokal (Localhost)

API Live yang tertera di bawah ini **hanya disediakan untuk keperluan demo dan melihat dokumentasi**.

Karena API ini di-hosting menggunakan layanan gratis (Render Free Tier), server memiliki batasan _resource_ yang ketat dan tidak didesain untuk menerima _traffic_ atau _request_ dari project/frontend orang lain.

**Jika Anda ingin menguji API, melakukan testing lanjutan, atau membangun frontend di atas API ini, Anda diwajibkan untuk menjalankan project ini secara lokal di mesin Anda dengan mengikuti panduan di bagian [Memulai](#memulai) di bawah.**

### Demo API Live (Hanya Referensi)

- **Base URL:** [https://maxsten.onrender.com](https://maxsten.onrender.com)
- **Dokumentasi API (Swagger UI):** [/docs/en](https://maxsten.onrender.com/docs/en) · [/docs/id](https://maxsten.onrender.com/docs/id)

> **Catatan Demo:** Server demo akan "tidur" setelah tidak ada aktivitas. Request pertama setelah _idle_ lama bisa memakan waktu 30-60 detik untuk membangunkan server. Request selanjutnya akan kembali cepat.

## Fitur

**Penjual**

- Setup toko dengan pemilihan lokasi auto-fill alamat dari kode pos, dan jam operasional yang bisa dikustomisasi (termasuk jadwal yang menyeberang tengah malam)
- Manajemen produk, varian, dan grup add-on
- Antrean pesanan real-time dengan update langsung (pesanan baru, perubahan status)
- Dashboard dengan metrik hari ini, grafik traffic per jam, dan tren bulan berjalan
- Riwayat penjualan dengan pagination, produk terlaris, dan add-on terlaris
- Override buka/tutup toko secara manual, independen dari jadwal operasional
- Template alasan pembatalan pesanan yang bisa dipakai ulang
- Laporan ringkasan toko berbasis AI dan saran deskripsi produk otomatis berbasis AI

**Pembeli**

- Tidak perlu akun — diidentifikasi lewat cookie guest yang di-generate otomatis
- Jelajahi katalog publik toko dengan pencarian fuzzy (toleran salah ketik)
- Buat pesanan, pantau status pesanan secara real-time, dan batalkan pesanan yang belum diproses
- Update status pesanan real-time lewat Socket.IO
- Pembuatan pesanan dibatasi rate limit per IP untuk mencegah penyalahgunaan

**Platform**

- Autentikasi berbasis cookie (`httpOnly`) yang didukung Supabase Auth, dengan refresh sesi otomatis
- Soft-delete di seluruh sistem, dengan pengecekan kepemilikan yang selalu di-scope ke toko milik user yang login
- Job terjadwal untuk otomatis membatalkan pesanan yang belum dibayar setelah lewat batas waktu
- Job terjadwal untuk membersihkan akun Supabase Auth yang yatim (gagal terhapus)

## Tech Stack

| Layer         | Teknologi                            |
| ------------- | ------------------------------------ |
| Runtime       | Node.js, Express                     |
| Database      | PostgreSQL via Prisma ORM            |
| Auth          | Supabase Auth (sesi berbasis cookie) |
| Real-time     | Socket.IO                            |
| Validasi      | Joi                                  |
| Testing       | Vitest, Supertest                    |
| Job terjadwal | node-cron                            |

## Memulai

Untuk menjalankan project ini di komputer Anda sendiri, ikuti langkah-langkah berikut:

### Prasyarat

- Node.js versi 18 atau lebih baru
- Database PostgreSQL (Lokal atau layanan cloud)
- Akun dan Project Supabase (untuk Authentication & Storage)

### 1. Instalasi

Clone repository ini dan install semua dependency:

```bash
git clone <repo-url>
cd maxsten-backend
npm install
```

### 2. Environment Variables

Buat file bernama `.env` di root folder project Anda, lalu salin format di bawah ini. Pastikan Anda mengisi nilai dari project Supabase dan database Anda sendiri:

```env
# Koneksi Database Prisma (Gunakan URL database PostgreSQL Anda)
DATABASE_URL=postgresql://user:password@localhost:5432/maxsten
DIRECT_URL=postgresql://user:password@localhost:5432/maxsten

# Konfigurasi Supabase
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_WEBHOOK_SECRET=your_webhook_secret
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Konfigurasi URL Lokal
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:3000

# Integrasi AI
OPENROUTER_API_KEY=your_openrouter_key

# Config Server
NODE_ENV=development
PORT=3000
```

> **⚠️ Peringatan:** `SUPABASE_SERVICE_ROLE_KEY` memiliki akses admin penuh — jangan pernah mengeksposnya ke sisi client atau menyimpannya di version control publik (Github, dll).

### 3. Setup Database (Prisma)

Sinkronkan skema database dari Prisma ke PostgreSQL Anda dengan menjalankan:

```bash
npx prisma generate
npx prisma migrate dev
```

### 4. Setup Tambahan Supabase (Webhook Trigger & Storage Bucket)

Project ini bergantung pada beberapa objek Supabase yang **tidak dikelola lewat Prisma migration** (trigger di schema `auth`, dan storage bucket). Objek-objek ini harus dibuat manual sekali lewat **SQL Editor** di Supabase Dashboard project Anda.

#### 4a. Trigger sinkronisasi email

Saat user mengubah email lewat Supabase Auth, trigger ini akan memanggil endpoint `/api/webhooks/email` di API ini agar tabel `User` ikut ter-update. Jalankan SQL berikut di **SQL Editor** Supabase:

```sql
CREATE OR REPLACE FUNCTION notify_email_updated()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM net.http_post(
    url := current_setting('app.webhook_email_url', true),
    body := jsonb_build_object(
      'record', to_jsonb(NEW),
      'old_record', to_jsonb(OLD)
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', current_setting('app.webhook_secret', true)
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_email_updated ON auth.users;
CREATE TRIGGER on_auth_user_email_updated
AFTER UPDATE ON auth.users
FOR EACH ROW EXECUTE FUNCTION notify_email_updated();
```

Lalu atur URL endpoint dan secret sesuai environment Anda (ganti dengan URL API Anda sendiri — bisa `http://localhost:3000/...` lewat tunnel seperti [ngrok](https://ngrok.com), atau URL deploy production):

```sql
ALTER DATABASE postgres SET app.webhook_email_url = 'https://URL-API-ANDA/api/webhooks/email';
ALTER DATABASE postgres SET app.webhook_secret = 'ISI_SAMA_DENGAN_SUPABASE_WEBHOOK_SECRET_DI_ENV';
```

> **Catatan:** Supabase (cloud) mengirim request ke endpoint ini, jadi endpoint Anda harus bisa diakses dari internet. Saat development lokal, jalankan `ngrok http 3000` untuk mendapatkan URL publik sementara. Jika Anda hanya ingin menjalankan/menguji fitur lain di luar sinkronisasi email, langkah ini bisa dilewati.

#### 4b. Storage Bucket

Buat 3 storage bucket berikut lewat **SQL Editor** yang sama:

```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('maxsten logo', 'maxsten logo', true, null, null),
  ('store-logos', 'store-logos', true, null, null),
  ('product-images', 'product-images', true, null, null)
ON CONFLICT (id) DO NOTHING;
```

Fungsi masing-masing bucket:

| Bucket           | Digunakan untuk                   |
| ---------------- | --------------------------------- |
| `maxsten logo`   | Logo aplikasi Maxsten             |
| `store-logos`    | Logo toko yang diunggah penjual   |
| `product-images` | Foto produk yang diunggah penjual |

Ketiga bucket bersifat **public** (bisa diakses baca tanpa autentikasi), tanpa batas ukuran file atau pembatasan tipe file.

### 5. Menjalankan Server

Jalankan server API dan WebSocket:

```bash
node src/main
```

Server dan WebSocket akan berjalan bersamaan di `http://localhost:3000` (atau port sesuai `.env` Anda).

## Testing

```bash
npx vitest
```

Test dijalankan langsung ke project Supabase dan database sungguhan — **gunakan project Supabase terpisah khusus untuk testing** dengan fitur _email confirmation_ dimatikan. Hal ini mencegah test run menghabiskan kuota email asli atau merusak data production.

> **⚠️ Sebelum menjalankan test suite:** turunkan dulu konfigurasi rate limiter di endpoint publik (buyer-facing). Secara default rate limiter diset ke **1 request per 10 menit** (`windowMs: 10 * 60 * 1000, max: 1`), yang akan membuat sebagian besar test unit gagal (banyak request beruntun ke endpoint yang sama dalam waktu singkat). Ubah sementara jadi **1 request per 1 detik** sebelum menjalankan `npx vitest`, lalu kembalikan ke nilai semula (10 menit) sebelum deploy ke production.

## Dokumentasi API

Dokumentasi REST API bersifat interaktif (Swagger UI) dan tersedia dalam 2 bahasa:

- 🇬🇧 English: [/docs/en](http://localhost:3000/docs/en) (Jika berjalan lokal)
- 🇮🇩 Bahasa Indonesia: [/docs/id](http://localhost:3000/docs/id) (Jika berjalan lokal)

Event WebSocket (room, koneksi/auth, bentuk payload) tidak tercakup di Swagger — silakan merujuk ke [`./docs/indonesian/websocket`](./docs/indonesian/websocket).

## Struktur Project

```
src/
├── application/      # Setup Express app, Prisma client, Supabase client
├── controller/       # Request handler
├── service/          # Business logic
├── middleware/       # Auth, error handling
├── socket/           # Handler event Socket.IO
├── validation/       # Schema Joi
└── error/            # Custom error class

test/                 # Test suite Vitest + Supertest
docs/                 # Dokumentasi WebSocket (REST ada di Swagger)
```

## Catatan Keputusan Desain

- **Soft-delete di mana-mana.** Toko, produk, varian, dan add-on tidak pernah dihapus permanen — data ditandai `is_delete: true` supaya data pesanan lama tetap utuh dan riwayat transaksi tidak rusak.
- **Kepemilikan diverifikasi di level query**, bukan cuma dicek setelahnya — tiap query sisi seller selalu difilter berdasarkan toko milik user yang login, jadi request ke data seller lain akan mengembalikan `404 Not Found`, bukan `403 Forbidden` (mencegah kebocoran informasi apakah resource tersebut ada atau tidak).
- **Jam operasional bisa menyeberang tengah malam.** Status buka/tutup toko dan penomoran antrean harian sama-sama memperhitungkan jadwal yang menyeberang tengah malam (misal buka 18:00 sore, tutup 03:00 pagi), bukan me-reset secara buta di jam 00:00 kalender.

## Lisensi

Project private — tidak dilisensikan untuk dipakai ulang secara komersial tanpa izin.
