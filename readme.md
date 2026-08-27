# MAXSTEN: Agile POS & Queue System for Pop-Up F&B

[![Frontend deployed on Vercel](https://img.shields.io/badge/Frontend-Vercel-black?logo=vercel)](https://maxsten.vercel.app/)
[![Backend deployed on Render](https://img.shields.io/badge/Backend-Render-46E3B7?logo=render)](https://maxsten.onrender.com)

**Maxsten** adalah sistem _Point of Sale_ (POS) dan Manajemen Antrean berkinerja tinggi yang dirancang khusus untuk UMKM F&B yang dinamis (seperti _Pop-up Events, Food Trucks, Bazaar_, dan _Tenant_ Festival).

Dibandingkan sistem POS konvensional yang kaku dan penuh _bloatware_ (fitur berlebih yang tidak terpakai), Maxsten berfokus pada **Kecepatan Transaksi, Visibilitas Antrean Real-Time, dan Analitik Berbasis AI**—membantu pedagang fokus melayani pelanggan yang membludak di acara tanpa dipusingkan oleh kerumitan sistem.

---

## Live Demo

Aplikasi ini sudah di-_deploy_ dan dapat diakses secara publik:

- **Frontend (Web App):** [https://maxsten.vercel.app](https://maxsten.vercel.app)
- **Backend API:** [https://maxsten.onrender.com](https://maxsten.onrender.com)

---

## Why Maxsten? (Key Highlights)

Meski dirancang dengan antarmuka yang simpel (_Lightweight_), Maxsten ditenagai oleh arsitektur _Backend_ setara _Enterprise_ untuk memastikan tidak ada data yang bocor di tengah _traffic_ acara yang padat.

1. **Pop-Up & Event Ready**
   Tidak perlu instalasi alat kasir yang rumit. Sistem berbasis web (_Cloud-first_) yang bisa langsung digunakan dari _Tablet_ kasir dan _Smartphone_ pelanggan di lapangan.
2. **Zero-Polling Real-Time Queues**
   Dilengkapi dengan teknologi **WebSocket (Socket.IO)**. Saat dapur mengubah status pesanan menjadi "Diproses" atau "Selesai", layar antrean di _smartphone_ pelanggan akan otomatis diperbarui pada milidetik yang sama tanpa perlu me-_refresh_ halaman browser.
3. **Enterprise-Grade Data Integrity**
   Menerapkan _Pessimistic Locking_ pada _Database_ untuk mencegah _Race Conditions_ (tabrakan data) jika kasir dan pembeli memanipulasi pesanan secara bersamaan. Menerapkan _Soft-Delete_ yang ketat agar histori finansial dan analitik hari-hari sebelumnya tidak rusak walau menu dihapus.
4. **AI-Driven Business Consultant**
   Mengintegrasikan LLM **Nvidia Nemotron 3 Ultra (via OpenRouter)** yang bertindak sebagai analis bisnis. AI secara otomatis membaca metrik toko, tren pembatalan, dan jam sibuk untuk memberikan rekomendasi strategi pada _event_ selanjutnya. (Dilengkapi dengan pengamanan anti _Prompt-Injection_).

---

## Repository Architecture (Monorepo)

Repositori ini menggunakan struktur **Monorepo** yang memisahkan aplikasi menjadi dua bagian independen (_Decoupled_):

### `/fe` (Frontend)

Aplikasi antarmuka klien (Kasir/Seller dan Pembeli/Guest). Bertanggung jawab atas manajemen _state_ keranjang belanja, koneksi WebSocket _real-time_, dan UI/UX yang responsif.
**[Selengkapnya tentang arsitektur Frontend](./fe/README.md)**

### `/be` (Backend)

Mesin utama API (RESTful & WebSocket). Bertanggung jawab atas _Business Logic_, validasi _Rate Limiting_, manajemen autentikasi (Bearer Token JWT), dan interaksi ke _Database_.
**[Selengkapnya tentang kerumitan Engineering Backend](./be/README.md)**

---

## 🛠️ Global Tech Stack

Aplikasi ini dibangun menggunakan ekosistem modern dengan fokus pada performa interaktif di sisi klien dan keandalan pemrosesan di sisi server.

**Frontend (Client & UI/UX):**

- **Core:** React 19, TypeScript, di-build menggunakan Vite 8.
- **State & Data Fetching:** TanStack React Query v5, Axios, React Router v7.
- **Styling & UI:** TailwindCSS v4, ekosistem Shadcn UI, Base UI, Lucide React.
- **Interactive & 3D Engine:** Three.js, React Three Fiber (R3F), Drei, GSAP, Framer Motion, Lenis (Smooth Scroll).
- **Utilities:** Recharts (Data Visualization), React Leaflet (Maps), Face-api.js, React QR Code.

**Backend (API & Real-Time Engine):**

- **Core Framework:** Node.js, Express.js v5.
- **Real-Time & Concurrency:** Socket.IO.
- **Validation & Security:** Joi, Express Rate Limit, Bcrypt.
- **Utilities & Logic:** Date-fns-tz (Timezone-aware analytics), Fuse.js (Fuzzy Search), Winston (Logging), Node-cron (Task Scheduling).
- **API Documentation:** Swagger UI Express, OpenAPI 3.0.

**Database, Auth & AI:**

- **Database & Storage:** PostgreSQL (Managed via Prisma ORM v7), Supabase Storage.
- **Authentication:** Supabase Auth (Strict Bearer Token Implementation).
- **AI Integration:** OpenRouter API (Nvidia Nemotron 3 Ultra) sebagai AI Business Consultant.

---

_Developed as a high-performance F&B solution by Aliyyul Munif - 2026_
