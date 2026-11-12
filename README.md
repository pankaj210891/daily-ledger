# Daily Ledger – Full-stack foundation

A TypeScript monorepo for Daily Ledger: React/Vite web, Node.js/Express REST API, MongoDB/Mongoose, and a planned React Native client.

## Decisions
- Email/password authentication first; Google sign-in can be added later.
- One household owner per signup today; schema includes household ownership so family membership can be added later.
- Vercel hosts the web app and Express-compatible serverless API.
- MongoDB Atlas is the persistent database.
- All business rules will live in the API/shared packages, not duplicated in web/mobile.

## Requirements
- Node.js 20+
- npm 10+
- MongoDB local instance or MongoDB Atlas free cluster

## Local setup
```bash
npm install
cp apps/api/.env.example apps/api/.env
# Set MONGODB_URI and a random JWT_ACCESS_SECRET (32+ chars)
npm run dev:api
```
API health: `http://localhost:4000/api/v1/health`

Web app:
```bash
npm run dev:web
```
Open `http://localhost:5173`. Set `VITE_API_URL=http://localhost:4000/api/v1` in `apps/web/.env.local` if needed.

## Authentication endpoints
- `POST /api/v1/auth/signup` `{ name, email, password, householdName? }`
- `POST /api/v1/auth/signin` `{ email, password }`
- `POST /api/v1/auth/forgot-password` `{ email }` (always returns a generic response)
- `POST /api/v1/auth/reset-password` `{ token, password }` (one-time, 30-minute token)
- `POST /api/v1/auth/refresh` refresh cookie required
- `POST /api/v1/auth/signout`
- `GET /api/v1/auth/me` Bearer access token required
- `GET /api/v1/health`

## Ledger REST API
The web app signs in or creates an account, then sends a bearer access token with each request. Ledger records are always scoped to the signed-in household.

- `GET /api/v1/entries` (optional `?type=delivery|product|expense|bill|staff|attendance|salary`)
- `POST /api/v1/entries` to create an entry
- `PATCH /api/v1/entries/:id` to update an entry
- `DELETE /api/v1/entries/:id` to remove an entry

Entry types share fields for name, category, amount, quantity/unit, date, due date, status and notes. These remain useful for manual and legacy records. Product schedules, delivery tracking and calculated monthly bills use dedicated household-scoped API resources instead; generic entries are not imported into product bills. See [docs/api.md](docs/api.md) for the domain API contract and business rules.

## Product deliveries and monthly bills
- `GET/POST /api/v1/products`, `PATCH /api/v1/products/:id`, and `POST /api/v1/products/:id/rates` manage products, per-time-slot schedules, expected quantities, and append-only effective-dated rates.
- `POST /api/v1/scheduled-deliveries/generate` and `GET /api/v1/scheduled-deliveries?from=YYYY-MM-DD&to=YYYY-MM-DD` generate/list scheduled instances.
- `POST/PATCH/DELETE /api/v1/scheduled-deliveries/:id/deliveries...` records partial/full delivery parts; dedicated actions record zero consumption, skip, or cancel.
- `POST /api/v1/bills/prepare` and `GET /api/v1/bills?month=YYYY-MM` calculate delivered charges with the rate effective on each scheduled date. Open quantity is an estimate; late delivery remains assigned to its original scheduled date and month.

## Staff, attendance and salary
- `GET/POST /api/v1/staff`, `PATCH /api/v1/staff/:id`, and `POST /api/v1/staff/:id/salary-revisions` manage linked staff profiles, weekly-off policies, and effective-dated pay.
- `GET /api/v1/attendance?month=YYYY-MM&staffId=:id` and `PUT /api/v1/attendance` load and save one attendance status for each staff/date. PTO and LOP require a reason.
- `GET/PUT/DELETE /api/v1/holidays` maintains a household-wide holiday calendar; listed holidays count as paid unless attendance is explicitly overridden.
- `GET /api/v1/salaries?month=YYYY-MM` calculates calendar-day proration and attendance-based deductions. Unmarked past/current dates count as present; future dates remain pending in the gross estimate without being counted present or deducted. Explicit absences and LOP deduct one daily rate.

For local development, copy `apps/api/.env.example` to `apps/api/.env`, put the MongoDB URI and a private random 32+ character JWT secret there, then run `npm run dev:api` and `npm run dev:web` in separate terminals. Open `http://localhost:5173`. If using a different web origin, set `WEB_ORIGIN` in the API environment.

Password reset emails use Resend. Create an API key, verify your sending domain/address with Resend, then set `RESEND_API_KEY` and `EMAIL_FROM` (for example, `Daily Ledger <accounts@your-domain.com>`) in `apps/api/.env` and set `WEB_ORIGIN` to the exact web app origin. Without email settings, development writes a reset URL to the API terminal for local use; production requires email settings and never returns a reset token in the API response. Reset tokens are stored as SHA-256 hashes, expire after 30 minutes, and can only be used once. A successful reset revokes all existing refresh sessions for that account.

Sign-in passwords appear in the request body in the browser's own developer tools because the browser submits them for server-side verification. This app does not log those bodies or store raw passwords; it stores an Argon2id hash. Use HTTPS for deployed web and API origins so the request is encrypted in transit. The local development URL uses HTTP only on localhost. Production web builds require `VITE_API_URL` to be set to the API's HTTPS base URL (for example, `https://api.example.com/api/v1`).

Signup creates a household and its owner. Refresh tokens are random opaque values; only SHA-256 hashes are stored. Passwords use Argon2id. Access JWTs are short-lived. The refresh cookie is HttpOnly, Secure in production and SameSite=Lax.

## Security notes / production checklist
- Set a unique 32+ character `JWT_ACCESS_SECRET`; never commit secrets.
- Configure exact `WEB_ORIGIN`; do not use wildcard credentialed CORS.
- Deploy only behind HTTPS.
- Add CSRF token/origin validation for cookie-authenticated refresh/signout flows before production. The current cookie is SameSite=Lax; add a synchronizer/double-submit CSRF design if cross-site deployment is required.
- Add email verification and password reset before public launch.
- Add household-scoped authorization to every future resource query; never trust household IDs from request bodies.
- Add account lockout/abuse monitoring, audit logs, backup/restore drills and security headers review.
- MongoDB Atlas: use a dedicated database user with least privilege and restrict network access. Avoid `0.0.0.0/0` where practical.
- Do not log passwords, cookies, authorization headers or raw refresh tokens.
- The current signup flow creates household and user in separate writes. Use a MongoDB transaction (replica set, as Atlas provides) for production hardening so partial signup cannot leave orphan records.

## Vercel deployment
Create two Vercel projects from this repository:
1. Web project root directory: `apps/web`; build command `npm run build:web` (configure workspace install/build appropriately); output directory `dist`. Set `VITE_API_URL` to the deployed API's HTTPS base URL at build time.
2. API project root directory: `apps/api`; use `vercel.json` and `api/index.ts` as the serverless entrypoint. Set `MONGODB_URI`, `JWT_ACCESS_SECRET`, `JWT_ACCESS_TTL`, `REFRESH_TOKEN_TTL_DAYS`, `COOKIE_NAME`, `WEB_ORIGIN`, `RESEND_API_KEY`, `EMAIL_FROM`, `NODE_ENV=production`.

For the npm workspaces monorepo, enable Vercel's workspace/root-directory support and ensure shared workspace packages are included when introduced. Test preview deployments before production. Vercel Functions are request-driven: do not run a persistent Express listener or in-memory scheduler there. Scheduled reminders need Vercel Cron or another external scheduler and idempotent database jobs.

## Web UI preview
The web workspace includes a mobile-first household dashboard, product and rate management, per-slot schedule setup, delivery part tracking, calculated monthly bills, linked staff profiles, attendance, and live salary calculations. Earlier generic staff and salary ledger entries remain separate; legacy staff entries are copied into staff profiles on first read, and unambiguous legacy attendance is linked by exact staff name. Finalized salary statements, payment history and recurring expense policies remain future work.

## Current scope
This is an incremental household ledger, not the complete planned product. Dedicated product, scheduled delivery, monthly bill, staff, attendance and live salary calculation APIs are implemented. Finalized salary statements, payment history, recurring expenses, and the React Native app remain future work.
