import 'server-only';

/** Production / commercial storefront — no demo catalog. */
export function isStorefrontCommercialMode(): boolean {
  if (process.env.STOREFRONT_COMMERCIAL?.trim().toLowerCase() === 'true') {
    return true;
  }
  if (process.env.VERCEL_ENV === 'production') return true;
  if (process.env.NODE_ENV === 'production') return true;
  return process.env.STOREFRONT_ALLOW_PREVIEW?.trim().toLowerCase() !== 'true';
}

export function isStorefrontConfigured(): boolean {
  return Boolean(
    process.env.STOREFRONT_SUPABASE_URL?.trim() &&
      process.env.STOREFRONT_SUPABASE_SERVICE_ROLE_KEY?.trim(),
  );
}
