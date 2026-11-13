# API contract (initial)

All endpoints are under `/api/v1`.

| Method | Path            | Auth           | Purpose                  |
| ------ | --------------- | -------------- | ------------------------ |
| GET    | `/health`       | No             | Health status            |
| POST   | `/auth/signup`  | No             | Create owner + household |
| POST   | `/auth/signin`  | No             | Authenticate             |
| POST   | `/auth/refresh` | Refresh cookie | Rotate refresh session   |
| POST   | `/auth/signout` | Refresh cookie | Revoke session           |
| GET    | `/auth/me`      | Bearer         | Current account          |

## Products, schedules, deliveries and bills

These routes require `Authorization: Bearer <accessToken>` and derive the household from the token.

| Method         | Path                                                  | Purpose                                                                                            |
| -------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| GET            | `/products`                                           | List household products, rate history, schedules and current rate                                  |
| POST           | `/products`                                           | Create a product with unit, initial rate and optional per-slot schedules                           |
| PATCH          | `/products/:id`                                       | Update product details, active state or schedules; archived products and historical records remain |
| POST           | `/products/:id/rates`                                 | Append a rate with an effective date; rates cannot be backdated                                    |
| POST           | `/scheduled-deliveries/generate`                      | Idempotently materialize scheduled entries for an inclusive date range of at most 93 days          |
| GET            | `/scheduled-deliveries?from=YYYY-MM-DD&to=YYYY-MM-DD` | List scheduled entries for a date range                                                            |
| POST           | `/scheduled-deliveries/:id/deliveries`                | Add a partial or full delivery record with its actual date                                         |
| PATCH / DELETE | `/scheduled-deliveries/:id/deliveries/:recordId`      | Correct or remove a delivery part                                                                  |
| POST           | `/scheduled-deliveries/:id/zero-consumption`          | Record zero consumption distinctly from skipping                                                   |
| POST           | `/scheduled-deliveries/:id/skip`                      | Explicitly skip a scheduled delivery                                                               |
| POST           | `/scheduled-deliveries/:id/cancel`                    | Cancel a scheduled delivery                                                                        |
| POST           | `/bills/prepare`                                      | Generate the selected month’s scheduled entries and return its calculated bill                     |
| GET            | `/bills?month=YYYY-MM`                                | Return the calculated monthly bill without materializing new schedules                             |

Product schedules support daily, selected weekdays (Sunday=0 through Saturday=6), or every X days, with a separate expected quantity per time slot. The selected `startsOn` date controls the first schedule date, including when it is in the past; an open-ended schedule has no automatic end date. On initial product creation, the starting rate defaults to the earliest schedule start (or today if there is no schedule). Scheduled date and rate effective date are date-only keys in the household’s initial Asia/Kolkata timezone. Schedule changes do not rewrite already generated entries; their quantity, product name and unit are snapshots.

Monthly bill totals charge only delivered quantity, using the rate effective on the scheduled date. Late delivery parts remain attached to their original scheduled date, so they affect that original month when recorded. Pending or partial balances stay open on that date; their estimated value is shown separately from delivered charges. Skipped, cancelled and zero-consumption entries are not billed; their unfulfilled quantity is reported as closed quantity so expected quantity reconciles to delivered, open and closed quantity. Generic `/entries` records remain stored separately and are not automatically imported into these domain models.

## Staff, attendance and salary

These resources are linked by `staffId`, are household-scoped, and require a bearer access token.

| Method | Path                                    | Purpose                                                                                                                                                        |
| ------ | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/staff`                                | List staff profiles and salary history; migrates earlier generic staff entries on first read                                                                   |
| POST   | `/staff`                                | Create a staff profile with joining date, initial monthly salary, weekly-off days and paid/unpaid weekly-off policy                                            |
| PATCH  | `/staff/:id`                            | Update profile, employment dates, active state or weekly-off policy                                                                                            |
| POST   | `/staff/:id/salary-revisions`           | Add an effective-dated salary revision (today or a future date)                                                                                                |
| GET    | `/attendance?month=YYYY-MM&staffId=:id` | List a staff member’s attendance for the month; exact-name legacy matches are migrated when unambiguous                                                        |
| PUT    | `/attendance`                           | Upsert one status per staff/date (`present`, `absent`, `pto`, `lop`, `weekly_off`, `holiday`)                                                                  |
| DELETE | `/attendance/:id`                       | Remove a recorded override; salary then applies the default attendance rule                                                                                    |
| GET    | `/holidays?month=YYYY-MM`               | List household-wide paid holidays for a month                                                                                                                  |
| PUT    | `/holidays`                             | Add or update a household holiday date and name                                                                                                                |
| DELETE | `/holidays/:id`                         | Remove a household holiday                                                                                                                                     |
| GET    | `/salaries?month=YYYY-MM`               | Calculate monthly gross, deductions, payable amount and daily breakdown from staff and attendance data                                                         |
| POST   | `/salaries/:staffId/finalize`           | Finalize and lock a completed month’s salary snapshot (`{ month }`); future attendance must no longer be pending                                               |
| POST   | `/salaries/:staffId/transactions`       | Record an advance, payment, or signed adjustment against a finalized statement (`{ month, kind, amount, date, note?, reason? }`); adjustments require a reason |

Salary uses monthly rate divided by calendar days in the month. Joining and end dates are included in proration. Unmarked past and current working dates count as present; future working dates remain pending, are included in the gross estimate, and have no deduction until recorded. PTO and dates in the household-wide holiday calendar are paid; explicit absence and LOP each deduct one daily rate. Weekly offs follow each staff profile’s effective-dated paid/unpaid setting. Finalized statements preserve the calculation snapshot, including the effective salary and attendance breakdown. The settlement is calculated as `max(0, finalized net payable + signed adjustments - advances - payments)`. Advances and payments reduce the balance; adjustments are listed separately and do not rewrite the snapshot. Transaction amounts are limited to paise precision, and adjustments require a reason. Generic salary entries remain separate and are not included in these calculations.

Success envelope: `{ "data": ... }`
Error envelope: `{ "error": { "code": "...", "message": "..." } }`

## Ledger entries

All entry routes require `Authorization: Bearer <accessToken>`. The API derives the household from the verified token; clients do not send a household ID.

| Method | Path           | Purpose                                                                  |
| ------ | -------------- | ------------------------------------------------------------------------ |
| GET    | `/entries`     | List up to 500 household entries, newest first; optional `?type=delivery | product | expense | bill | staff | attendance | salary` |
| POST   | `/entries`     | Create an entry                                                          |
| PATCH  | `/entries/:id` | Update editable fields on an entry                                       |
| DELETE | `/entries/:id` | Delete an entry                                                          |

The current entry contract is intentionally generic: `type`, `name`, `category`, `amount`, `quantity`, `unit`, `date`, `dueDate`, `status`, and `notes`. It does not yet represent product rate history or schedules, delivery parts, leave policies, salary statements, recurring expenses, or payment allocations. The web app must not infer those financial rules from these generic fields.

Generic `/entries` remain available for legacy and manual records. They are stored separately and do not contribute to product-based monthly bills. Use `/products`, `/scheduled-deliveries`, and `/bills` for scheduled deliveries and calculated charges; those records retain product and rate history.

## Recurring household expenses

These routes require a bearer access token and derive the household from the verified token.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/recurring-expenses` | List the household's monthly expense policies |
| POST | `/recurring-expenses` | Create a policy with name, amount, day of month, start date, optional end date, category and notes |
| PATCH | `/recurring-expenses/:id` | Edit a policy or pause/resume it with `isActive` |
| DELETE | `/recurring-expenses/:id` | Delete a policy; previously generated ledger entries remain |
| POST | `/recurring-expenses/generate` | Idempotently create this month's upcoming expense entries (`{ "month": "YYYY-MM" }`) |

Day 29–31 policies are scheduled on the last calendar day in shorter months. The start and optional end dates are inclusive. Paused policies are not generated. Generated entries use the existing `expense` ledger type and `upcoming` status, so normal ledger payment and reporting flows apply. Re-running preparation returns the existing occurrence instead of duplicating it.

## Web session behavior

The web client keeps the short-lived access token in memory and sends it as a bearer token. On reload or access-token expiry it calls `/auth/refresh`; the API rotates the refresh session in an HttpOnly cookie. Sign-out clears the in-memory access token and revokes the refresh session.
