# CJ Dropshipping fulfillment

The shop uses CJ API 2.0 with conservative defaults:

- customers enter shipping details before Creem checkout;
- a paid order is sent to CJ only when an authenticated admin clicks **Send to CJ**;
- `CJ_SANDBOX` defaults to enabled;
- production requires both `CJ_SANDBOX=false` and
  `CJ_PRODUCTION_ENABLED=true`;
- orders are created with `payType=3`, so production CJ orders are not charged
  automatically. Review and pay them in CJ before fulfillment;
- **Sync CJ** fetches the latest CJ status and tracking number.

## Setup

1. Run `supabase/migrations/034_cj_fulfillment.sql` in the shop Supabase
   project after migrations 029–033.
2. In Vercel Production, set:
   - `CJ_API_KEY` (recommended), or a current `CJ_ACCESS_TOKEN`;
   - `CJ_SANDBOX=true`;
   - `CJ_FROM_COUNTRY_CODE=CN` (or the actual origin);
   - `CJ_DEFAULT_LOGISTIC_NAME` to a method returned by CJ freight
     calculation.
3. Redeploy.
4. In shop admin, edit each product and add its exact CJ variant ID (`VID`).
   Optionally override the default logistics name for that product.
5. Checkout now collects a destination country from a fixed ISO list and
   verifies the logistics name against CJ freight before Creem opens.
6. Make a sandbox purchase, open **Orders**, click **Send to CJ**, then verify
   the order appears in CJ as a sandbox order.
6. Click **Sync CJ** to verify status synchronization. CJ's sandbox simulation
   endpoints can be used to add a test tracking number.

## Production activation

Before changing modes, verify the destination, VID, logistics method, cost,
tax/IOSS handling, and CJ account balance with a sandbox order. Then set:

```text
CJ_SANDBOX=false
CJ_PRODUCTION_ENABLED=true
```

Redeploy. The integration still creates the CJ order without charging it.
Complete payment in CJ and use **Sync CJ** until tracking is returned.

Never put a CJ API key or token in source control, browser code, screenshots,
chat, or logs. Revoke and replace any credential that was exposed.

## Failure and duplicate handling

The local order UUID is sent as CJ's unique `orderNumber`. Before retrying an
ambiguous or interrupted submission, the server queries CJ with that UUID.
This prevents a normal retry from intentionally creating a second fulfillment
order. If CJ created an order but the local save failed, do not create it
manually—use **Send to CJ** again so reconciliation runs first.

Shipping addresses are personal data. They are stored only in the server-only
orders table, whose client access is denied by RLS. Restrict Supabase service
role access and define an operational retention/deletion policy.
