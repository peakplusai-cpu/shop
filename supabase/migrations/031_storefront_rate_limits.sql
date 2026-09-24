-- Atomic, distributed abuse protection for checkout and admin login.
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
  current_time TIMESTAMPTZ := clock_timestamp();
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
  VALUES (p_key, current_time, 1)
  ON CONFLICT (key) DO UPDATE
  SET
    window_started_at = CASE
      WHEN limits.window_started_at
        <= current_time - make_interval(secs => p_window_seconds)
      THEN current_time
      ELSE limits.window_started_at
    END,
    request_count = CASE
      WHEN limits.window_started_at
        <= current_time - make_interval(secs => p_window_seconds)
      THEN 1
      ELSE limits.request_count + 1
    END
  WHERE
    limits.window_started_at
      <= current_time - make_interval(secs => p_window_seconds)
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
