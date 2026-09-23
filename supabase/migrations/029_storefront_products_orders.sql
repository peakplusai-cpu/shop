-- Migration 029 — Single-product storefront and fulfillment tracking
-- Safe to run on a NEW empty Supabase project (no PeakPlus coaches/leads schema).

CREATE TABLE IF NOT EXISTS public.products (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug           TEXT        NOT NULL UNIQUE,
  title          TEXT        NOT NULL,
  description    TEXT        NOT NULL,
  price          NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  main_image_url TEXT        NOT NULL,
  creem_link     TEXT        NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
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
    CHECK (status IN ('pending', 'paid', 'shipped')),
  tracking_number  TEXT,
  customer_email   TEXT,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_product_id
  ON public.orders (product_id);
CREATE INDEX IF NOT EXISTS idx_orders_status
  ON public.orders (status);

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

-- Storefront reads are performed by trusted Server Components. Keeping client
-- access closed prevents order enumeration and hides checkout configuration.
DROP POLICY IF EXISTS "deny_client_access" ON public.products;
CREATE POLICY "deny_client_access"
  ON public.products
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "deny_client_access" ON public.orders;
CREATE POLICY "deny_client_access"
  ON public.orders
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

COMMENT ON TABLE public.products IS
  'Products displayed by the server-rendered luxury storefront';
COMMENT ON TABLE public.orders IS
  'Capability-link order records updated by the verified Creem webhook';

-- Demo product so /shop renders immediately after migration (replace creem_link in prod).
INSERT INTO public.products (
  slug,
  title,
  description,
  price,
  main_image_url,
  creem_link
)
VALUES (
  'nomad-leather-sleeve',
  'Nomad Leather Sleeve',
  'Hand-finished full-grain leather. Minimal silhouette, maximum presence — designed for the traveler who moves quietly and arrives with intention.',
  289.00,
  'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1600&q=80',
  'https://www.creem.io'
)
ON CONFLICT (slug) DO NOTHING;
