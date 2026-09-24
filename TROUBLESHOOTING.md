# Storefront production troubleshooting

## Admin login

- **Application error**: inspect the latest Vercel Function log and confirm the
  deployment uses the `shop` repository and project root. A stale or failed
  deployment can serve code that differs from GitHub `main`.
- **Configure a password…**: one of `STOREFRONT_ADMIN_PASSWORD` (minimum 16
  characters), `STOREFRONT_ADMIN_SECRET`, or
  `STOREFRONT_ADMIN_TOTP_SECRET` is missing or invalid in the active Vercel
  environment.
- **Vercel is missing STOREFRONT_SUPABASE…**: add the shop project's URL and
  service-role key to Production, then redeploy.
- **Rate limit could not reach Supabase…**: verify the URL/key pair belongs to
  the same shop project and run migrations 031 and 032.
- **Login protection is temporarily unavailable**: Vercel did not provide a
  trusted client-IP header. Check Function logs for
  `trusted client IP missing`.
- **Too many sign-in attempts**: wait 15 minutes, or remove only
  `admin-login:%` rows from `storefront_rate_limits`.
- **Invalid password or authentication code**: the infrastructure is working.
  Check the exact Vercel password, ensure the phone clock is automatic, use a
  time-based six-digit TOTP with a 30-second period, and ensure the
  authenticator seed exactly matches the active Production variable.
- **Login succeeds but returns to login**: cookies may be blocked, the admin
  session secret changed after login, or an IP allowlist no longer matches the
  current public IP.

Any admin secret shown in chat, screenshots, logs, or recordings must be
rotated. Generate one new set, replace both Vercel secrets, replace the
authenticator entry, and redeploy. Do not mix values from separate generator
runs.

## Supabase and catalog

- Wrong project URL/key: catalog shows setup state and admin/rate limits fail.
- `anon` key used as service role: all privileged database calls fail.
- Migrations missing or applied to PeakPlus instead of shop: tables/functions
  are absent even though Vercel variables look valid.
- Empty `products`: catalog reports an empty collection.
- Invalid/duplicate slug, malformed image URL, or malformed Creem product ID:
  product save returns an admin error.
- Migration 033 missing: active catalog filtering, payment snapshots, order
  administration, and checkout inserts fail. Run it before deploying the
  matching application code.
- Supabase outage, key rotation, quota, or paused project: all dynamic catalog,
  order, admin, and rate-limit operations fail closed.

## Checkout

- Missing product `creem_product_id`: checkout returns 503. Every active
  product requires its own Creem product mapping.
- Test-mode product with production API key (or the reverse): Creem rejects the
  product.
- Missing/invalid Creem API key: checkout creation fails.
- Missing or non-HTTPS storefront URL: success URL generation fails in
  production.
- Creem timeout/outage: the API returns a recoverable error and the pending
  order remains available for signed webhook reconciliation.
- Checkout rate limit: more than eight attempts per IP in ten minutes returns
  429.
- Database insert failure, deleted product, or Supabase outage: no checkout is
  created.
- Browser/network interruption after checkout creation: retry may create a
  second pending checkout; reconcile by payment records before fulfillment.

## Creem webhook and order status

- Wrong webhook URL: payment succeeds but the order stays pending.
- Wrong webhook secret or modified body: signature verification returns 401.
- Wrong event selection/name: event is acknowledged as skipped.
- Missing `metadata.order_id`, malformed UUID, or unknown order: status cannot
  be updated.
- Product ID, base price, currency, paid amount, checkout ID, request ID, mode,
  and payment status are verified before a local order becomes paid. Any
  mismatch returns 409 and requires reconciliation.
- Webhook arrives more than once: later deliveries are safely acknowledged as
  already processed.
- Payload over 256 KB: request is rejected with 413.
- Supabase outage/configuration failure: Creem should retry the 5xx response.
- An order can remain pending if Creem exhausts retries; production operations
  still need a reconciliation job comparing Creem payments with shop orders.

## Buyer login and tracking

- Buyer sign-in is not linked from the storefront because order ownership is
  not yet implemented. If re-enabled, OAuth requires matching public Supabase
  URL/anon key and an exact callback URL registered in Supabase.
- Callback code exchange failure returns to `/shop/login`.
- Tracking links are capability URLs: anyone with the UUID link can view order
  status and tracking number. Never publish these links.

## CJ Dropshipping fulfillment

- Checkout says fulfillment is not configured: add a CJ `VID` and logistics
  name to the product, or set `CJ_DEFAULT_LOGISTIC_NAME`.
- **Send to CJ** is absent: the order must be paid and contain the CJ/address
  snapshots created by migration 034 and the updated checkout.
- CJ API is not configured: set `CJ_API_KEY` or `CJ_ACCESS_TOKEN` in the active
  Vercel environment and redeploy.
- Authentication failed: revoke exposed/expired credentials, create a new API
  key or access token, update Vercel, and redeploy.
- Product or logistics errors: confirm the exact CJ variant ID, destination
  availability, origin country, and logistics name with CJ freight
  calculation.
- Sandbox orders never ship real goods. Keep `CJ_SANDBOX=true` until the
  complete workflow has been verified.
- Real fulfillment is intentionally double-locked by `CJ_SANDBOX=false` and
  `CJ_PRODUCTION_ENABLED=true`.
- Production orders use `payType=3`; creation does not charge the CJ balance.
  Review and pay the order in CJ, then use **Sync CJ**.
- A timeout is reconciled by querying CJ with the local UUID before another
  create call. Do not manually duplicate the same order in CJ.
- Migration 034 missing: shipping snapshots, product VID mapping, submission,
  and tracking synchronization fail.

## Deployment and domain

- Environment variables are scoped separately to Production, Preview, and
  Development; changing one scope does not change an existing deployment.
- Every environment-variable change requires a new deployment.
- A custom domain must point to the same Vercel project. Set
  `NEXT_PUBLIC_STOREFRONT_URL` to the canonical HTTPS origin before accepting
  payment.
- GitHub `main`, Vercel's selected repository/branch, and the latest Ready
  deployment must reference the same commit.
- DNS/TLS propagation, domain redirects, CSP, browser extensions, and corporate
  proxies can cause failures not reproducible on the Vercel domain.

## Required monitoring before real sales

- Alert on checkout 5xx, webhook 4xx/5xx, login protection failures, and orders
  pending beyond the expected payment window.
- Reconcile Creem payments against orders and retain webhook/provider IDs.
- Back up Supabase, test restoration, and document secret rotation.
- Load-test expected peak traffic; passing a build does not prove
  million-order capacity.
