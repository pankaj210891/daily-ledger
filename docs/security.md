# Security baseline

- Argon2id password hashing; minimum 12-character passwords.
- Access JWT expires quickly; refresh tokens are opaque, hashed at rest, rotated and revocable.
- The web app keeps access JWTs in memory, not local storage; reloads obtain a fresh access token through the refresh cookie.
- HttpOnly refresh cookie; Secure in production; SameSite=Lax.
- Helmet, explicit credentialed CORS, bounded JSON body, auth rate limiter.
- Mongoose schemas and Zod request validation.
- Password reset uses generic responses to prevent account discovery, SHA-256 hashed one-time tokens, 30-minute expiry, and revokes refresh sessions after a successful reset. Production email delivery uses Resend (`RESEND_API_KEY`, `EMAIL_FROM`); development can print a reset URL to the API terminal.
- Household ID is included in access claims. Future data routes must scope all reads/writes to this claim.
- Never return passwordHash or tokenHash.
- Production launch gates: CSRF strategy, email verification, verified Resend sender configuration, transactional signup, security review, monitoring and tested backups.
