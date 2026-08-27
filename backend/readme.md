# Maxsten Backend

Backend utama untuk sistem manajemen antrean Maxsten. Service ini menangani pembuatan tiket antrean, pengelolaan status antrean secara real-time, autentikasi pengguna, serta komunikasi dengan database dan layanan eksternal.

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js 5
- **Database:** PostgreSQL (Supabase)
- **ORM:** Prisma 7
- **Real-time:** Socket.IO
- **Validation:** Joi
- **Authentication:** Supabase Auth
- **API Documentation:** Swagger UI
- **Testing:** Vitest & Supertest

## Prerequisites

Sebelum menjalankan project, pastikan sudah tersedia:

- Node.js
- Git
- Akun dan project Supabase

## Getting Started

### 1. Clone Repository

```bash
git clone https://github.com/username/maxsten-backend.git
cd maxsten/backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Variables

Buat file `.env` di root project dan isi konfigurasi berikut:

```env
DATABASE_URL=""

OPENROUTER_API_KEY=""

FRONTEND_URL=""
BACKEND_URL=""

DIRECT_URL=""

SUPABASE_URL=""
SUPABASE_WEBHOOK_SECRET=""
SUPABASE_SERVICE_ROLE_KEY=""
```

`DATABASE_URL` digunakan untuk koneksi aplikasi ke PostgreSQL, sedangkan `DIRECT_URL` digunakan untuk kebutuhan Prisma yang memerlukan koneksi langsung ke database.

### 4. Generate Prisma Client

Generate Prisma Client dengan:

```bash
npx prisma generate
```

Untuk menyinkronkan schema Prisma dengan database:

```bash
npx prisma db push
```

### 5. Run Development Server

Jalankan server menggunakan Nodemon agar server otomatis melakukan restart ketika terjadi perubahan:

```bash
nodemon src/main
```

## Real-time Communication

Maxsten menggunakan Socket.IO untuk menangani komunikasi real-time antara client dan server, terutama untuk perubahan status antrean.

Dokumentasi mengenai konfigurasi, event, dan aturan penggunaan Socket.IO tersedia di:

[Socket.IO Documentation](./docs/websocket/socket-io.md)

## API Documentation

Dokumentasi REST API tersedia melalui Swagger UI.

### Local

```text
http://localhost:3000/docs
```

### Production

```text
https://maxsten.onrender.com/docs
```

Swagger menampilkan endpoint yang tersedia beserta request, response, dan parameter yang digunakan.

## Testing

Project menggunakan Vitest dan Supertest untuk pengujian aplikasi dan endpoint API.

Jalankan seluruh test suite dengan:

```bash
npm test
```

Pastikan script berikut tersedia di `package.json`:

```json
{
  "scripts": {
    "test": "vitest"
  }
}
```

## Project Structure

Struktur utama project:

```text
.
├── docs/
│   └── websocket/
│       └── socket-io.md       # Dokumentasi Socket.IO
│
├── prisma/
│   └── schema.prisma          # Database schema
│
├── src/
│   ├── controller/            # HTTP request handlers
│   ├── services/              # Business logic
│   ├── route/                 # API route definitions
│   └── validation/            # Request validation dengan Joi
│
└── package.json
```

Struktur ini memisahkan routing, controller, business logic, dan validation agar masing-masing bagian memiliki tanggung jawab yang jelas dan lebih mudah dikembangkan.
