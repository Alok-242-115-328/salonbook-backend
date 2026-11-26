# SalonBook Server

Express + TypeScript REST API for SalonBook with Better Auth, MongoDB/Mongoose, JWT verification, ImgBB uploads and Stripe Checkout.

## Important features

- Better Auth email/password and Google OAuth with role (`admin` | `customer`) and `isBlocked` fields
- First registered user automatically becomes admin; later users are customers
- Optional `ADMIN_PIN` promotion endpoint for controlled admin setup
- JWT verification middleware plus fresh database role/block checks on protected APIs
- Public service browsing, search, category filter and price sorting
- Admin service CRUD and active/inactive control
- Customer booking, cancellation and admin confirmation/cancellation with slot conflict checks
- Stripe Checkout and webhook-verified payment updates and transaction records
- ImgBB image upload proxy with strict type, size and rate limits

## Technology stack

Node.js, Express.js, TypeScript, MongoDB, Mongoose, Better Auth, jsonwebtoken, Stripe, ImgBB, Multer, Zod.

## Installation

```bash
npm install
cp .env.example .env
```

Fill in the environment variables in `.env`. Never commit `.env`.

## Required environment variables

`PORT`, `NODE_ENV`, `MONGODB_URI`, `CLIENT_URL`, `SERVER_URL`, `BETTER_AUTH_SECRET`, `JWT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PAYMENT_CURRENCY`, `IMGBB_API_KEY`, `ADMIN_PIN`

## Run locally

```bash
npm run seed
npm run build
npm start
```

The API runs on `http://localhost:5000`. Health check: `GET /api/health`.

## Scripts

- `npm run build` - compile TypeScript
- `npm start` - run compiled output
- `npm run typecheck` - validate types
- `npm run seed` - replace service collection with eight sample services

## Stripe webhook

Payment status changes only after a verified webhook event. For local development:

```bash
stripe listen --forward-to localhost:5000/api/payments/webhook
```

Copy the printed webhook signing secret into `STRIPE_WEBHOOK_SECRET` and restart the API. In production, register `https://<server-domain>/api/payments/webhook` in the Stripe dashboard and subscribe to `checkout.session.completed` and `checkout.session.async_payment_succeeded`.

## Main API routes

- `/api/auth/*` - Better Auth
- `POST /api/session/token` - exchange authenticated session for a short-lived API JWT
- `/api/services` - public browsing and admin CRUD
- `/api/appointments` - booking and role-based management
- `/api/payments/create-checkout`, `POST /api/payments/webhook`
- `/api/users`, `/api/transactions` - admin only
- `/api/profile`, `/api/uploads`, `/api/admin/promote`

## Repository

Server repository: add its GitHub URL after pushing this folder as its own repository.
