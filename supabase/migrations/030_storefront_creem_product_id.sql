-- Migration 030 — Creem product ID for API checkout (commercial storefront)

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS creem_product_id TEXT;

COMMENT ON COLUMN public.products.creem_product_id IS
  'Creem Dashboard product id (prod_…) used when creating checkouts via API';

-- Optional: set on your live SKU after creating the product in Creem.
-- UPDATE public.products SET creem_product_id = 'prod_your_id' WHERE slug = 'nomad-leather-sleeve';
