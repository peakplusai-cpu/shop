import 'server-only';

/**
 * Storefront Supabase — separate project from PeakPlus coach/auth database.
 */

function requireStorefrontEnv(value: string | undefined, name: string): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return trimmed;
}

export function getStorefrontSupabaseUrl(): string {
  return requireStorefrontEnv(
    process.env.STOREFRONT_SUPABASE_URL,
    'STOREFRONT_SUPABASE_URL',
  );
}

export function getStorefrontSupabaseServiceRoleKey(): string {
  return requireStorefrontEnv(
    process.env.STOREFRONT_SUPABASE_SERVICE_ROLE_KEY,
    'STOREFRONT_SUPABASE_SERVICE_ROLE_KEY',
  );
}
