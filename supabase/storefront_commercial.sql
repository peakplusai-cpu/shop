-- Storefront commercial database (NEW Supabase project — not PeakPlus)
-- Run once in SQL Editor, then set STOREFRONT_* env vars in Vercel / .env.local

CREATE TABLE IF NOT EXISTS public.products (
  id               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  slug             TEXT           NOT NULL UNIQUE,
  title            TEXT           NOT NULL,
  description      TEXT           NOT NULL,
  price            NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  main_image_url   TEXT           NOT NULL,
  creem_link       TEXT           NOT NULL,
  creem_product_id TEXT,
  cj_vid           TEXT,
  cj_logistic_name TEXT,
  active           BOOLEAN        NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  CONSTRAINT products_slug_format
    CHECK (slug = LOWER(slug) AND slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT products_creem_link_https
    CHECK (creem_link ~ '^https://')
);

CREATE TABLE IF NOT EXISTS public.orders (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id       UUID        NOT NULL
    REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  status           TEXT        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'shipped', 'delivered')),
  tracking_number  TEXT,
  customer_email   TEXT,
  product_title    TEXT        NOT NULL,
  amount_cents     BIGINT      NOT NULL CHECK (amount_cents >= 0),
  amount_paid_cents BIGINT     CHECK (
    amount_paid_cents IS NULL OR amount_paid_cents >= 0
  ),
  currency         TEXT        NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  creem_product_id TEXT,
  creem_checkout_id TEXT,
  creem_order_id   TEXT,
  creem_event_id   TEXT,
  checkout_idempotency_key UUID,
  cj_vid           TEXT,
  cj_logistic_name TEXT,
  shipping_email   TEXT,
  shipping_customer_name TEXT,
  shipping_phone   TEXT,
  shipping_country_code TEXT CHECK (
    shipping_country_code IS NULL OR shipping_country_code ~ '^[A-Z]{2}$'
  ),
  shipping_country TEXT,
  shipping_province TEXT,
  shipping_city    TEXT,
  shipping_county  TEXT,
  shipping_address TEXT,
  shipping_address2 TEXT,
  shipping_zip     TEXT,
  shipping_house_number TEXT,
  cj_fulfillment_order_id TEXT,
  cj_status        TEXT,
  cj_tracking_provider TEXT,
  cj_tracking_url  TEXT,
  cj_request_id    TEXT,
  cj_error         TEXT,
  cj_sandbox       BOOLEAN,
  cj_submission_started_at TIMESTAMPTZ,
  cj_submitted_at  TIMESTAMPTZ,
  cj_last_synced_at TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at          TIMESTAMPTZ,
  shipped_at       TIMESTAMPTZ,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_product_id ON public.orders (product_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders (status);
CREATE INDEX IF NOT EXISTS idx_products_active_created_at
  ON public.products (active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_created_at
  ON public.orders (created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_creem_checkout_id_unique
  ON public.orders (creem_checkout_id)
  WHERE creem_checkout_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_creem_order_id_unique
  ON public.orders (creem_order_id)
  WHERE creem_order_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_creem_event_id_unique
  ON public.orders (creem_event_id)
  WHERE creem_event_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_cj_fulfillment_order_id_unique
  ON public.orders (cj_fulfillment_order_id)
  WHERE cj_fulfillment_order_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_checkout_idempotency_key_unique
  ON public.orders (checkout_idempotency_key)
  WHERE checkout_idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_cj_status
  ON public.orders (cj_status)
  WHERE cj_fulfillment_order_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.set_storefront_order_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_storefront_order_updated_at ON public.orders;
CREATE TRIGGER set_storefront_order_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_storefront_order_updated_at();

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deny_client_access" ON public.products;
CREATE POLICY "deny_client_access"
  ON public.products FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "deny_client_access" ON public.orders;
CREATE POLICY "deny_client_access"
  ON public.orders FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

CREATE TABLE IF NOT EXISTS public.storefront_rate_limits (
  key               TEXT        PRIMARY KEY,
  window_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  request_count     INTEGER     NOT NULL DEFAULT 1
    CHECK (request_count > 0)
);

ALTER TABLE public.storefront_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.consume_storefront_rate_limit(
  p_key TEXT,
  p_limit INTEGER,
  p_window_seconds INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  accepted_count INTEGER;
  window_now TIMESTAMPTZ := clock_timestamp();
BEGIN
  IF p_key IS NULL OR LENGTH(p_key) > 200
     OR p_limit < 1 OR p_limit > 10000
     OR p_window_seconds < 1 OR p_window_seconds > 86400 THEN
    RAISE EXCEPTION 'Invalid rate-limit arguments';
  END IF;

  INSERT INTO public.storefront_rate_limits AS limits (
    key,
    window_started_at,
    request_count
  )
  VALUES (p_key, window_now, 1)
  ON CONFLICT (key) DO UPDATE
  SET
    window_started_at = CASE
      WHEN limits.window_started_at
        <= window_now - make_interval(secs => p_window_seconds)
      THEN window_now
      ELSE limits.window_started_at
    END,
    request_count = CASE
      WHEN limits.window_started_at
        <= window_now - make_interval(secs => p_window_seconds)
      THEN 1
      ELSE limits.request_count + 1
    END
  WHERE
    limits.window_started_at
      <= window_now - make_interval(secs => p_window_seconds)
    OR limits.request_count < p_limit
  RETURNING request_count INTO accepted_count;

  RETURN accepted_count IS NOT NULL;
END;
$$;

REVOKE ALL ON TABLE public.storefront_rate_limits FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.consume_storefront_rate_limit(TEXT, INTEGER, INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_storefront_rate_limit(TEXT, INTEGER, INTEGER)
  TO service_role;

INSERT INTO public.products (
  slug, title, description, price, main_image_url, creem_link, creem_product_id
)
VALUES (
  'nomad-leather-sleeve',
  'Nomad Leather Sleeve',
  'Hand-finished full-grain leather. Minimal silhouette, maximum presence — designed for the traveler who moves quietly and arrives with intention.',
  289.00,
  'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1600&q=80',
  'https://www.creem.io',
  NULL
)
ON CONFLICT (slug) DO NOTHING;

-- After creating your Creem product:
-- UPDATE public.products SET creem_product_id = 'prod_xxxxx' WHERE slug = 'nomad-leather-sleeve';
