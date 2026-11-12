# Architecture

## Runtime
- `apps/web`: Vite SPA.
- `apps/api`: Express app. `src/server.ts` is local listener; `api/index.ts` exports the Express app for Vercel Functions.
- MongoDB Atlas: durable persistence.
- Mobile app will call the same versioned REST API.

## Tenant model
`Household` owns household data. `User.householdId` associates the owner with one household. Future membership model: `HouseholdMember { householdId, userId, role, status }`. All tenant data access must derive householdId from authenticated claims, never client input.

## Auth
Password -> Argon2id. Access token -> short-lived signed JWT. Refresh token -> random opaque secret in HttpOnly cookie; database stores SHA-256 hash, expiry and revocation state. Refresh rotates session token. Signout revokes current session.

## Domain modules planned
Consumption: Product, ProductSchedule, ScheduledEntry, DeliveryRecord.
Staff: Staff profiles with effective-dated salary and weekly-off revisions, Attendance records linked by staff ID, household-wide holidays, and live monthly salary calculations. Finalized SalaryStatement snapshots and payment history remain future work.
Finance: Payment, HouseholdExpense.
Reminder: ReminderPreference, ReminderJob.
