# Production security setup

Before enabling real checkout:

1. Run `supabase/migrations/031_storefront_rate_limits.sql` in the shop
   Supabase SQL Editor. Hosted deployments intentionally reject checkout and
   admin login if the distributed limiter is unavailable.
2. Run `npm run security:setup-admin` locally.
3. Add the printed `STOREFRONT_ADMIN_SECRET` and
   `STOREFRONT_ADMIN_TOTP_SECRET` to the shop's Vercel environment variables.
4. Import the printed `otpauth://` URI into a TOTP authenticator and store a
   protected recovery copy of the Base32 seed.
5. Set `STOREFRONT_ADMIN_PASSWORD` to a unique password of at least 16
   characters. Do not reuse a PeakPlus password.
6. Redeploy, then confirm `/shop/admin/login` requires both the password and a
   six-digit code.

Optional: set `STOREFRONT_ADMIN_ALLOWED_IPS` to a comma-separated list of
trusted public IPs. Do not commit generated secrets or the authenticator URI.
