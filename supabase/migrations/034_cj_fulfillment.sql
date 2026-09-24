-- CJ Dropshipping fulfillment mappings, shipping snapshots, and synchronization.
-- Shipping fields are intentionally nullable for orders created before this migration.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS cj_vid TEXT,
  ADD COLUMN IF NOT EXISTS cj_logistic_name TEXT;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS checkout_idempotency_key UUID,
  ADD COLUMN IF NOT EXISTS cj_vid TEXT,
  ADD COLUMN IF NOT EXISTS cj_logistic_name TEXT,
  ADD COLUMN IF NOT EXISTS shipping_email TEXT,
  ADD COLUMN IF NOT EXISTS shipping_customer_name TEXT,
  ADD COLUMN IF NOT EXISTS shipping_phone TEXT,
  ADD COLUMN IF NOT EXISTS shipping_country_code TEXT,
  ADD COLUMN IF NOT EXISTS shipping_country TEXT,
  ADD COLUMN IF NOT EXISTS shipping_province TEXT,
  ADD COLUMN IF NOT EXISTS shipping_city TEXT,
  ADD COLUMN IF NOT EXISTS shipping_county TEXT,
  ADD COLUMN IF NOT EXISTS shipping_address TEXT,
  ADD COLUMN IF NOT EXISTS shipping_address2 TEXT,
  ADD COLUMN IF NOT EXISTS shipping_zip TEXT,
  ADD COLUMN IF NOT EXISTS shipping_house_number TEXT,
  ADD COLUMN IF NOT EXISTS cj_fulfillment_order_id TEXT,
  ADD COLUMN IF NOT EXISTS cj_status TEXT,
  ADD COLUMN IF NOT EXISTS cj_tracking_provider TEXT,
  ADD COLUMN IF NOT EXISTS cj_tracking_url TEXT,
  ADD COLUMN IF NOT EXISTS cj_request_id TEXT,
  ADD COLUMN IF NOT EXISTS cj_error TEXT,
  ADD COLUMN IF NOT EXISTS cj_sandbox BOOLEAN,
  ADD COLUMN IF NOT EXISTS cj_submission_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cj_submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cj_last_synced_at TIMESTAMPTZ;

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check
    CHECK (status IN ('pending', 'paid', 'shipped', 'delivered'));

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_cj_vid_length,
  DROP CONSTRAINT IF EXISTS products_cj_logistic_name_length;

ALTER TABLE public.products
  ADD CONSTRAINT products_cj_vid_length
    CHECK (cj_vid IS NULL OR char_length(cj_vid) BETWEEN 1 AND 50),
  ADD CONSTRAINT products_cj_logistic_name_length
    CHECK (
      cj_logistic_name IS NULL
      OR char_length(cj_logistic_name) BETWEEN 1 AND 50
    );

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_shipping_country_code_format,
  DROP CONSTRAINT IF EXISTS orders_cj_fulfillment_order_id_length;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_shipping_country_code_format
    CHECK (
      shipping_country_code IS NULL
      OR shipping_country_code ~ '^[A-Z]{2}$'
    ),
  ADD CONSTRAINT orders_cj_fulfillment_order_id_length
    CHECK (
      cj_fulfillment_order_id IS NULL
      OR char_length(cj_fulfillment_order_id) BETWEEN 1 AND 200
    );

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_cj_fulfillment_order_id_unique
  ON public.orders (cj_fulfillment_order_id)
  WHERE cj_fulfillment_order_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_checkout_idempotency_key_unique
  ON public.orders (checkout_idempotency_key)
  WHERE checkout_idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_cj_status
  ON public.orders (cj_status)
  WHERE cj_fulfillment_order_id IS NOT NULL;
