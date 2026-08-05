# Maxsten API

Backend API for **Maxsten** — a queue management system designed for Indonesian small businesses (UMKM). Sellers can manage stores, products, and customer queues in real time, while buyers can browse store catalogs and place orders without creating an account.

Built with **Node.js/Express**, **Prisma ORM**, **Supabase Auth**, and **Socket.IO** for real-time updates.

---

## ⚠️ Important: Run Locally (Localhost)

The live API listed below is provided **for documentation and demonstration purposes only**.

Since it is hosted on **Render Free Tier**, the server has limited resources and is **not intended to handle traffic or requests from external frontend projects**.

If you want to test the API, perform more extensive testing, or build your own frontend on top of it, **you should run the project locally** by following the setup guide below.

---

## Live Demo API (Reference Only)

**Base URL:** https://maxsten.onrender.com

**Swagger Documentation:**

* `/docs/en`
* `/docs/id`

**Demo Note:** The demo server automatically sleeps after a period of inactivity. The first request after being idle may take **30–60 seconds** while the server wakes up. Subsequent requests will be fast again.

---

# Features

## Seller

* Store setup with location selection, automatic address lookup from postal code, and customizable operating hours (including overnight schedules)
* Product, variant, and add-on group management
* Real-time order queue updates (new orders and status changes)
* Dashboard with today's metrics, hourly traffic chart, and monthly trends
* Sales history with pagination, best-selling products, and top-performing add-ons
* Manual store open/close override independent of scheduled operating hours
* Reusable order cancellation reason templates
* AI-generated business performance summaries and AI-assisted product description suggestions

## Buyer

* No account required — buyers are identified using an automatically generated guest cookie
* Browse public store catalogs with fuzzy search (typo-tolerant)
* Create orders, track order status in real time, and cancel orders that have not yet been processed
* Real-time order status updates via Socket.IO
* Order creation is protected with per-IP rate limiting to prevent abuse

## Platform

* Cookie-based authentication (httpOnly) powered by Supabase Auth with automatic session refresh
* System-wide soft delete with ownership checks always scoped to the authenticated seller's store
* Scheduled job that automatically cancels unpaid orders after the payment timeout expires
* Scheduled cleanup job for orphaned Supabase Auth accounts that failed to be deleted

---

# Tech Stack

| Layer          | Technology                            |
| -------------- | ------------------------------------- |
| Runtime        | Node.js, Express                      |
| Database       | PostgreSQL via Prisma ORM             |
| Authentication | Supabase Auth (cookie-based sessions) |
| Real-time      | Socket.IO                             |
| Validation     | Joi                                   |
| Testing        | Vitest, Supertest                     |
| Scheduled Jobs | node-cron                             |

---

# Getting Started

To run this project on your own machine, follow these steps.

## Prerequisites

* Node.js 18 or later
* PostgreSQL database (local or cloud-hosted)
* A Supabase project (Authentication & Storage)

---

## 1. Installation

Clone the repository and install all dependencies:

```bash
git clone <repo-url>
cd maxsten-backend
npm install
```

---

## 2. Environment Variables

Create a `.env` file in the project root and copy the template below. Replace each value with your own PostgreSQL and Supabase credentials.

```env
# Prisma Database Connection
DATABASE_URL=postgresql://user:password@localhost:5432/maxsten
DIRECT_URL=postgresql://user:password@localhost:5432/maxsten

# Supabase Configuration
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_WEBHOOK_SECRET=your_webhook_secret
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Local URLs
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:3000

# AI Integration
OPENROUTER_API_KEY=your_openrouter_key

# Server Configuration
NODE_ENV=development
PORT=3000
```

> **Warning:** `SUPABASE_SERVICE_ROLE_KEY` grants full administrative access to your Supabase project. Never expose it to client-side code or commit it to a public repository.

---

## 3. Database Setup (Prisma)

Synchronize your Prisma schema with PostgreSQL:

```bash
npx prisma generate
npx prisma migrate dev
```

---

## 4. Run the Server

Start both the REST API and the WebSocket server:

```bash
node src/main
```

The server will be available at:

```
http://localhost:3000
```

(or whichever port is configured in your `.env` file).

---

# Testing

```bash
npx vitest
```

The test suite runs against a **real PostgreSQL database and Supabase project**. It is recommended to use a dedicated Supabase project for testing with **email confirmation disabled**. This prevents automated tests from consuming production email quotas or affecting production data.

---

# API Documentation

Interactive Swagger documentation is available in two languages:

* 🇬🇧 English: `/docs/en` (when running locally)
* 🇮🇩 Indonesian: `/docs/id` (when running locally)

WebSocket events (rooms, authentication flow, and payload formats) are **not included in Swagger**. Please refer to:

```
./docs/english/websocket
```

---

# Project Structure

```
src/
├── application/      # Express app, Prisma client, Supabase client
├── controller/       # Request handlers
├── service/          # Business logic
├── middleware/       # Authentication & error handling
├── socket/           # Socket.IO event handlers
├── validation/       # Joi validation schemas
└── error/            # Custom error classes

test/                 # Vitest + Supertest test suite
docs/                 # WebSocket documentation (REST API is documented in Swagger)
```

---

# Design Decisions

### Soft Delete Everywhere

Stores, products, variants, and add-ons are never physically deleted. Instead, they are marked with `is_delete = true` to preserve historical order data and maintain transaction integrity.

### Ownership Verification at the Query Level

Seller queries are always scoped to stores owned by the authenticated user. Requests targeting another seller's resources return **404 Not Found** instead of **403 Forbidden**, preventing information disclosure about whether a resource exists.

### Overnight Operating Hours

Store availability and daily queue numbering both support operating schedules that cross midnight (for example, opening at **6:00 PM** and closing at **3:00 AM**). Queue numbering is based on the actual business day rather than resetting automatically at midnight.

---

# License

This project is private and is **not licensed for commercial reuse or redistribution without prior permission**.
