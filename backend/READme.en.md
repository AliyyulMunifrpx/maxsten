# Maxsten API

Backend API for **Maxsten** — a queue management system for small businesses (UMKM) in Indonesia. Sellers manage their store, menu, and order queue in real time; buyers can browse a store's menu and place orders without needing an account.

Built with Node.js/Express, Prisma ORM, and Supabase Auth, with real-time updates via Socket.IO.

## ⚠️ Important: Run It Locally

The live API listed below is **provided for demo and documentation purposes only**.

Because this API is hosted on a free tier (Render Free Tier), the server has strict resource limits and is not designed to handle traffic or requests from other people's projects/frontends.

**If you want to test the API, do further testing, or build a frontend on top of this API, you are required to run this project locally on your own machine by following the [Getting Started](#getting-started) guide below.**

### Live Demo API (Reference Only)

- **Base URL:** [https://maxsten.onrender.com](https://maxsten.onrender.com)
- **API Documentation (Swagger UI):** [/docs/en](https://maxsten.onrender.com/docs/en) · [/docs/id](https://maxsten.onrender.com/docs/id)

> **Demo note:** The demo server "sleeps" after a period of inactivity. The first request after a long idle period may take 30–60 seconds to wake the server up. Subsequent requests will be fast again.

## Features

**Seller**

- Store setup with location picker and auto-filled address from postal code, plus customizable operating hours (including schedules that cross midnight)
- Product, variant, and add-on group management
- Real-time order queue with live updates (new orders, status changes)
- Dashboard with today's metrics, hourly traffic charts, and month-to-date trends
- Sales history with pagination, best-selling products, and best-selling add-ons
- Manual store open/closed override, independent of the operating hours schedule
- Reusable order cancellation reason templates
- AI-generated store summary reports and AI-suggested product descriptions

**Buyer**

- No account needed — identified via an auto-generated guest cookie
- Browse a store's public catalog with fuzzy search (typo-tolerant)
- Place orders, track order status in real time, and cancel orders that haven't been processed yet
- Real-time order status updates via Socket.IO
- Order creation is rate-limited per IP to prevent abuse

**Platform**

- Cookie-based (`httpOnly`) authentication backed by Supabase Auth, with automatic session refresh
- Soft-delete throughout the system, with ownership checks always scoped to the logged-in user's own store
- Scheduled job to automatically cancel unpaid orders past their deadline
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
- PostgreSQL database (local or a cloud provider)
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

> **⚠️ Warning:** `SUPABASE_SERVICE_ROLE_KEY` has full admin access — never expose it on the client side or commit it to public version control (GitHub, etc.).

### 3. Database Setup (Prisma)

Sync the database schema from Prisma to your PostgreSQL database by running:

```bash
npx prisma generate
npx prisma db push
```

### 4. Additional Supabase Setup (Webhook Trigger & Storage Buckets)

This project depends on a few Supabase objects that are **not managed through Prisma migrations** (a trigger on the `auth` schema, and storage buckets). These need to be created once, manually, via the **SQL Editor** in your Supabase Dashboard.

#### 4a. Email sync trigger

When a user updates their email through Supabase Auth, this trigger calls the `/api/webhooks/email` endpoint on this API so the `User` table stays in sync. Run the following SQL in the Supabase **SQL Editor**:

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

Then set the endpoint URL and secret for your environment (replace with your own API URL — either `http://localhost:3000/...` via a tunnel like [ngrok](https://ngrok.com), or your production deployment URL):

```sql
ALTER DATABASE postgres SET app.webhook_email_url = 'https://YOUR-API-URL/api/webhooks/email';
ALTER DATABASE postgres SET app.webhook_secret = 'SAME_VALUE_AS_SUPABASE_WEBHOOK_SECRET_IN_ENV';
```

> **Note:** Supabase (cloud) sends the request to this endpoint, so your endpoint must be reachable from the internet. During local development, run `ngrok http 3000` to get a temporary public URL. If you only want to run/test other features besides email sync, this step can be skipped.

#### 4b. Storage Buckets

Create the following 3 storage buckets via the same **SQL Editor**:

```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('maxsten logo', 'maxsten logo', true, null, null),
  ('store-logos', 'store-logos', true, null, null),
  ('product-images', 'product-images', true, null, null)
ON CONFLICT (id) DO NOTHING;
```

Purpose of each bucket:

| Bucket           | Used for                           |
| ---------------- | ---------------------------------- |
| `maxsten logo`   | The Maxsten app's own logo         |
| `store-logos`    | Store logos uploaded by sellers    |
| `product-images` | Product photos uploaded by sellers |

All three buckets are **public** (readable without authentication), with no file size limit or file type restriction.

### 5. Running the Server

Run the API and WebSocket server:

```bash
node src/main
```

The server and WebSocket will run together on `http://localhost:3000` (or the port set in your `.env`).

## Testing

```bash
npx vitest
```

Tests run directly against a real Supabase project and database — **use a separate Supabase project dedicated to testing**, with email confirmation disabled. This prevents test runs from using up real email quota or corrupting production data.

> **⚠️ Before running the test suite:** temporarily lower the rate limiter config on public (buyer-facing) endpoints. By default the rate limiter is set to **1 request per 10 minutes** (`windowMs: 10 * 60 * 1000, max: 1`), which will cause most unit tests to fail (many consecutive requests hit the same endpoint in a short time). Change it temporarily to **1 request per second** before running `npx vitest`, then restore it to the original value (10 minutes) before deploying to production.

## API Documentation

Interactive REST API documentation (Swagger UI) is available in 2 languages:

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
└── error/            # Custom error classes

test/                 # Vitest + Supertest test suite
docs/                 # WebSocket documentation (REST is covered in Swagger)
```

## Design Decision Notes

- **Soft-delete everywhere.** Stores, products, variants, and add-ons are never permanently deleted — data is marked `is_delete: true` so historical order data stays intact and transaction history isn't broken.
- **Ownership is verified at the query level**, not checked after the fact — every seller-side query is always filtered to the logged-in user's own store, so a request for another seller's data returns `404 Not Found` instead of `403 Forbidden` (preventing information leakage about whether the resource exists at all).
- **Operating hours can cross midnight.** Both store open/closed status and daily queue numbering account for schedules that cross midnight (e.g. open 6 PM, close 3 AM), rather than blindly resetting at calendar midnight.

## License

Private project — not licensed for commercial reuse without permission.
