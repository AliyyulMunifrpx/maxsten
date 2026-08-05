# Maxsten API

Backend API for **Maxsten** — a queue management system for Indonesian small businesses (UMKM). Sellers manage their store, menu, and order queue in real time; buyers can browse a store's menu and place orders without creating an account.

Built with Node.js/Express, Prisma ORM, and Supabase Auth, with real-time updates via Socket.IO.

## ⚠️ Important: Run It Locally

The live API listed below is **provided for demo purposes and viewing the documentation only**.

Because this API is hosted on a free-tier service (Render Free Tier), the server has strict resource limits and isn't designed to handle traffic or requests from other people's projects/frontends.

**If you want to test the API, run further testing, or build a frontend on top of this API, you are required to run this project locally on your own machine by following the [Getting Started](#getting-started) section below.**

### Live Demo API (Reference Only)

- **Base URL:** [https://maxsten.onrender.com](https://maxsten.onrender.com)
- **API Documentation (Swagger UI):** [/docs/en](https://maxsten.onrender.com/docs/en) · [/docs/id](https://maxsten.onrender.com/docs/id)

> **Demo Note:** The demo server "sleeps" after a period of inactivity. The first request after a long idle period may take 30-60 seconds to wake the server up. Subsequent requests will be fast again.

## Features

**Seller**

- Store setup with location picker and address auto-fill from postal code, plus customizable operating hours (including schedules that cross midnight)
- Product, variant, and add-on group management
- Real-time order queue with live updates (new orders, status changes)
- Dashboard with today's metrics, hourly traffic charts, and month-to-date trends
- Sales history with pagination, best-selling products, and best-selling add-ons
- Manual store open/close override, independent of the operating hours schedule
- Reusable order cancellation reason templates
- AI-generated store summary reports and AI-assisted product description suggestions

**Buyer**

- No account needed — identified via an auto-generated guest cookie
- Browse a store's public catalog with fuzzy search (typo-tolerant)
- Place orders, track order status in real time, and cancel orders that haven't been processed yet
- Real-time order status updates via Socket.IO
- Order creation is rate-limited per IP to prevent abuse

**Platform**

- Cookie-based (`httpOnly`) authentication backed by Supabase Auth, with automatic session refresh
- Soft-delete throughout the system, with ownership checks always scoped to the logged-in user's store
- Scheduled job to automatically cancel unpaid orders once they pass the time limit
- Scheduled job to clean up orphaned Supabase Auth accounts (failed deletions)

## Tech Stack

| Layer          | Technology                            |
| -------------- | ------------------------------------- |
| Runtime        | Node.js, Express                      |
| Database       | PostgreSQL via Prisma ORM             |
| Auth           | Supabase Auth (cookie-based sessions) |
| Real-time      | Socket.IO                             |
| Validation     | Joi                                   |
| Testing        | Vitest, Supertest                     |
| Scheduled jobs | node-cron                             |

## Getting Started

To run this project on your own machine, follow the steps below.

### Prerequisites

- Node.js version 18 or newer
- PostgreSQL database (local or a cloud service)
- A Supabase account and project (for Authentication & Storage)

### 1. Installation

Clone this repository and install all dependencies:

```bash
git clone <repo-url>
cd maxsten-backend
npm install
```

### 2. Environment Variables

Create a file named `.env` in the project root, then copy the format below. Make sure to fill in the values from your own Supabase project and database:

```env
# Prisma database connection (use your own PostgreSQL database URL)
DATABASE_URL=postgresql://user:password@localhost:5432/maxsten
DIRECT_URL=postgresql://user:password@localhost:5432/maxsten

# Supabase configuration
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_WEBHOOK_SECRET=your_webhook_secret
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Local URL configuration
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:3000

# AI integration
OPENROUTER_API_KEY=your_openrouter_key

# Server config
NODE_ENV=development
PORT=3000
```

> **⚠️ Warning:** `SUPABASE_SERVICE_ROLE_KEY` has full admin access — never expose it to the client side or commit it to public version control (GitHub, etc).

### 3. Database Setup (Prisma)

Sync the Prisma schema to your PostgreSQL database by running:

```bash
npx prisma generate
npx prisma migrate dev
```

### 4. Running the Server

Run the API and WebSocket server:

```bash
node src/main
```

The server and WebSocket will run together at `http://localhost:3000` (or the port set in your `.env`).

## Testing

```bash
npx vitest
```

Tests run directly against a real Supabase project and database — **use a separate Supabase project dedicated to testing** with _email confirmation_ disabled. This prevents test runs from consuming real email quota or corrupting production data.

> **⚠️ Before running the test suite:** temporarily lower the rate limiter configuration on the public (buyer-facing) endpoints. By default the rate limiter is set to **1 request per 10 minutes** (`windowMs: 10 * 60 * 1000, max: 1`), which will cause most unit tests to fail (many back-to-back requests hit the same endpoint in a short window). Change it temporarily to **1 request per 1 second** before running `npx vitest`, then revert it back to the original value (10 minutes) before deploying to production.

## API Documentation

The REST API documentation is interactive (Swagger UI) and available in 2 languages:

- 🇬🇧 English: [/docs/en](http://localhost:3000/docs/en) (if running locally)
- 🇮🇩 Bahasa Indonesia: [/docs/id](http://localhost:3000/docs/id) (if running locally)

WebSocket events (rooms, connection/auth, payload shapes) are not covered in Swagger — please refer to [`./docs/indonesian/websocket`](./docs/indonesian/websocket).

## Project Structure

```
src/
├── application/      # Express app setup, Prisma client, Supabase client
├── controller/       # Request handlers
├── service/          # Business logic
├── middleware/       # Auth, error handling
├── socket/           # Socket.IO event handlers
├── validation/       # Joi schemas
└── error/             # Custom error class

test/                 # Vitest + Supertest test suite
docs/                 # WebSocket documentation (REST is covered in Swagger)
```

## Design Decision Notes

- **Soft-delete everywhere.** Stores, products, variants, and add-ons are never permanently deleted — data is marked `is_delete: true` so historical order data stays intact and transaction history isn't broken.
- **Ownership is verified at the query level**, not just checked afterward — every seller-side query is always filtered by the logged-in user's store, so a request for another seller's data returns `404 Not Found` rather than `403 Forbidden` (preventing information leakage about whether the resource exists at all).
- **Operating hours can cross midnight.** Both the store's open/close status and daily queue numbering correctly account for schedules that cross midnight (e.g. open 6 PM, close 3 AM), instead of blindly resetting at calendar midnight.

## License

Private project — not licensed for commercial reuse without permission.
