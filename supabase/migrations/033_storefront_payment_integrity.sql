-- Payment integrity, product archiving, and fulfillment operations.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS product_title TEXT,
  ADD COLUMN IF NOT EXISTS amount_cents BIGINT,
  ADD COLUMN IF NOT EXISTS amount_paid_cents BIGINT,
  ADD COLUMN IF NOT EXISTS currency TEXT,
  ADD COLUMN IF NOT EXISTS creem_product_id TEXT,
  ADD COLUMN IF NOT EXISTS creem_checkout_id TEXT,
  ADD COLUMN IF NOT EXISTS creem_order_id TEXT,
  ADD COLUMN IF NOT EXISTS creem_event_id TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ;

UPDATE public.orders AS orders
SET
  product_title = COALESCE(orders.product_title, products.title),
  amount_cents = COALESCE(
    orders.amount_cents,
    ROUND(products.price * 100)::BIGINT
  ),
  currency = COALESCE(orders.currency, 'USD'),
  creem_product_id = COALESCE(
    orders.creem_product_id,
    products.creem_product_id
  )
FROM public.products AS products
WHERE orders.product_id = products.id;

ALTER TABLE public.orders
  ALTER COLUMN product_title SET NOT NULL,
  ALTER COLUMN amount_cents SET NOT NULL,
  ALTER COLUMN currency SET NOT NULL;

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_amount_cents_positive,
  DROP CONSTRAINT IF EXISTS orders_amount_paid_cents_positive,
  DROP CONSTRAINT IF EXISTS orders_currency_format;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_amount_cents_positive CHECK (amount_cents >= 0),
  ADD CONSTRAINT orders_amount_paid_cents_positive
    CHECK (amount_paid_cents IS NULL OR amount_paid_cents >= 0),
  ADD CONSTRAINT orders_currency_format CHECK (currency ~ '^[A-Z]{3}$');

CREATE INDEX IF NOT EXISTS idx_products_active_created_at
  ON public.products (active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_created_at
  ON public.orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_pending_created_at
  ON public.orders (created_at)
  WHERE status = 'pending';
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_creem_checkout_id_unique
  ON public.orders (creem_checkout_id)
  WHERE creem_checkout_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_creem_order_id_unique
  ON public.orders (creem_order_id)
  WHERE creem_order_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_creem_event_id_unique
  ON public.orders (creem_event_id)
  WHERE creem_event_id IS NOT NULL;
