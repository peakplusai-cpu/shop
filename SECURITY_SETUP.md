# Production security setup

Before enabling real checkout:

1. Run `supabase/migrations/031_storefront_rate_limits.sql` in the shop
   Supabase SQL Editor, followed by
   `supabase/migrations/032_storefront_rate_limit_fn_fix.sql` and
   `supabase/migrations/033_storefront_payment_integrity.sql`. Hosted
   deployments intentionally reject checkout and admin login if the
   distributed limiter is unavailable. Migration 033 must be installed before
   deploying code that creates payment snapshots.
2. Run `npm run security:setup-admin` locally.
3. Add the printed `STOREFRONT_ADMIN_SECRET` and
   `STOREFRONT_ADMIN_TOTP_SECRET` to the shop's Vercel environment variables.
4. Add the printed `STOREFRONT_ADMIN_TOTP_SECRET` to a TOTP authenticator as a
   time-based setup key. Confirm its displayed code matches the script's
   `Expected current 6-digit code` (allow one 30-second rollover).
5. Set `STOREFRONT_ADMIN_PASSWORD` to a unique password of at least 16
   characters. Do not reuse a PeakPlus password.
6. Redeploy, then confirm `/shop/admin/login` requires both the password and a
   six-digit code.

Optional: set `STOREFRONT_ADMIN_ALLOWED_IPS` to a comma-separated list of
trusted public IPs. Do not commit generated secrets or the authenticator URI.

## If login says “Invalid password or authentication code”

- Confirm the Vercel variables are enabled for **Production**, then redeploy.
- Copy only the text after `=`; do not include quotes or the variable name.
- Ensure the phone's date and time are set automatically.
- Confirm the authenticator uses TOTP/time-based, six digits, and a 30-second
  period.
- Five attempts within 15 minutes trigger a temporary lock. Wait 15 minutes or
  delete the matching `admin-login:*` row from `storefront_rate_limits`.
- If any secret appears in chat, logs, screenshots, or screen recordings,
  generate a new set and replace both Vercel values and the authenticator entry.
