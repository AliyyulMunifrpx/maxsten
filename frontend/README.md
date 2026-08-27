# Maxsten Frontend

Frontend application untuk sistem antrean Maxsten. Aplikasi ini menangani pembuatan dan pemantauan antrean secara real-time, serta menyediakan antarmuka yang interaktif dengan animasi, elemen 3D, peta, dan visualisasi data.

## Tech Stack

### Core

- React 19
- Vite 8
- TypeScript
- Tailwind CSS 4

TypeScript digunakan secara bertahap, terutama pada beberapa komponen dan konfigurasi yang membutuhkan dukungan typing.

### Routing & Data

- React Router 7
- TanStack Query 5
- Axios

### UI

- Shadcn UI
- Base UI
- Lucide React
- Tailwind Merge
- Class Variance Authority

### Animation & 3D

- Framer Motion
- GSAP
- Three.js
- React Three Fiber
- Lenis

### Additional Features

- Leaflet & React Leaflet — Maps
- Recharts — Data visualization
- React QR Code — QR code generation

### Backend & Real-time

- Supabase Client
- Socket.io Client

## Prerequisites

Pastikan sudah tersedia:

- Node.js
- NPM, Yarn, atau pnpm

## Getting Started

### 1. Masuk ke direktori frontend

```bash
cd maxsten/frontend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Setup environment variables

Buat file `.env` di root folder frontend, sejajar dengan `package.json`.

```env
VITE_API_URL=http://localhost:3000/api
VITE_BACKEND_URL=http://localhost:3000
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

| Variable                 | Description                       |
| ------------------------ | --------------------------------- |
| `VITE_API_URL`           | URL REST API backend              |
| `VITE_BACKEND_URL`       | URL utama backend untuk Socket.io |
| `VITE_SUPABASE_URL`      | URL project Supabase              |
| `VITE_SUPABASE_ANON_KEY` | Public anon key dari Supabase     |

Jangan memasukkan file `.env` ke repository.

### 4. Jalankan development server

```bash
npm run dev
```

Secara default, Vite akan menjalankan aplikasi di:

```text
http://localhost:5173
```

## Real-time Integration

Maxsten menggunakan Socket.io untuk menerima perubahan status antrean secara langsung dari backend tanpa perlu melakukan refresh halaman.

Dokumentasi event dan aturan WebSocket tersedia di:

```text
../backend/docs/websocket/socket-io.md
```

## Project Structure

```text
frontend/
├── src/
│   ├── assets/              # Images, 3D models, dan static assets
│   ├── components/          # Reusable components
│   │   └── ui/              # UI components
│   ├── lib/                 # Utility functions
│   ├── pages/               # Page components
│   ├── App.tsx              # Root application component
│   └── main.tsx             # Application entry point
│
├── .env                     # Environment variables
├── package.json
├── tsconfig.json
└── vite.config.js
```

## Development

Untuk menjalankan aplikasi selama proses development:

```bash
npm run dev
```

Untuk melakukan build production:

```bash
npm run build
```

Preview hasil build production:

```bash
npm run preview
```
