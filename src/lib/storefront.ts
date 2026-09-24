import 'server-only';

import {
  DEMO_STOREFRONT_PRODUCT,
  isDemoProductSlug,
} from '@/lib/storefront-demo';
import {
  isStorefrontCommercialMode,
  isStorefrontConfigured,
} from '@/lib/storefront-mode';
import { createStorefrontAdminClient } from '@/lib/supabase/storefront-admin';
import type { Database } from '@/types/database';

export type StorefrontProduct =
  Database['public']['Tables']['products']['Row'];
export type StorefrontOrder =
  Database['public']['Tables']['orders']['Row'];
export type PublicStorefrontProduct = Pick<
  StorefrontProduct,
  | 'id'
  | 'slug'
  | 'title'
  | 'description'
  | 'price'
  | 'main_image_url'
  | 'created_at'
>;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type StorefrontSetupReason =
  | 'schema_missing'
  | 'not_configured'
  | 'empty_catalog';

export type StorefrontProductLoadResult =
  | {
      status: 'ok';
      product: StorefrontProduct;
      /** Local design preview only — checkout disabled. */
      preview?: boolean;
    }
  | { status: 'not_found' }
  | { status: 'setup'; reason: StorefrontSetupReason };

export type StorefrontCatalogLoadResult =
  | {
      status: 'ok';
      products: PublicStorefrontProduct[];
      preview?: boolean;
    }
  | { status: 'setup'; reason: StorefrontSetupReason };

function previewProduct(slug: string): StorefrontProductLoadResult {
  if (!isDemoProductSlug(slug)) return { status: 'not_found' };
  return {
    status: 'ok',
    product: DEMO_STOREFRONT_PRODUCT,
    preview: true,
  };
}

function isMissingProductsTable(message: string): boolean {
  const lower = message.toLowerCase();
  if (!lower.includes('products')) return false;
  return (
    (lower.includes('relation') && lower.includes('does not exist')) ||
    lower.includes('could not find the table') ||
    lower.includes('schema cache')
  );
}

export function getDefaultProductSlug(): string {
  return (
    process.env.STOREFRONT_DEFAULT_SLUG?.trim() || 'nomad-leather-sleeve'
  );
}

function setupReasonFromError(message: string): StorefrontSetupReason {
  if (isMissingProductsTable(message)) return 'schema_missing';
  return 'not_configured';
}

export async function loadStorefrontProduct(
  slug: string,
): Promise<StorefrontProductLoadResult> {
  if (!isStorefrontConfigured()) {
    if (isStorefrontCommercialMode()) {
      return { status: 'setup', reason: 'not_configured' };
    }
    return previewProduct(slug);
  }

  let admin;
  try {
    admin = createStorefrontAdminClient();
  } catch {
    return isStorefrontCommercialMode()
      ? { status: 'setup', reason: 'not_configured' }
      : previewProduct(slug);
  }

  const { data, error } = await admin
    .from('products')
    .select('*')
    .eq('slug', slug)
    .eq('active', true)
    .maybeSingle();

  if (error) {
    console.error('[storefront] product lookup failed:', error.message);
    return { status: 'setup', reason: setupReasonFromError(error.message) };
  }

  if (!data) {
    return isStorefrontCommercialMode()
      ? { status: 'not_found' }
      : previewProduct(slug);
  }

  return { status: 'ok', product: data };
}

export async function loadDefaultStorefrontProduct(): Promise<StorefrontProductLoadResult> {
  const preferred = getDefaultProductSlug();
  return loadStorefrontProduct(preferred);
}

export async function loadStorefrontProducts(): Promise<StorefrontCatalogLoadResult> {
  if (!isStorefrontConfigured()) {
    if (isStorefrontCommercialMode()) {
      return { status: 'setup', reason: 'not_configured' };
    }
    return {
      status: 'ok',
      products: [DEMO_STOREFRONT_PRODUCT],
      preview: true,
    };
  }

  let admin;
  try {
    admin = createStorefrontAdminClient();
  } catch {
    return isStorefrontCommercialMode()
      ? { status: 'setup', reason: 'not_configured' }
      : {
          status: 'ok',
          products: [DEMO_STOREFRONT_PRODUCT],
          preview: true,
        };
  }

  const { data, error } = await admin
    .from('products')
    .select('id, slug, title, description, price, main_image_url, created_at')
    .eq('active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[storefront] catalog lookup failed:', error.message);
    return { status: 'setup', reason: setupReasonFromError(error.message) };
  }

  if (!data?.length) {
    return { status: 'setup', reason: 'empty_catalog' };
  }

  return { status: 'ok', products: data };
}

/** @deprecated Prefer loadStorefrontProduct for setup-aware pages. */
export async function getProductBySlug(
  slug: string,
): Promise<StorefrontProduct | null> {
  const result = await loadStorefrontProduct(slug);
  if (result.status === 'ok') return result.product;
  return null;
}

export async function getOrderById(
  orderId: string,
): Promise<StorefrontOrder | null> {
  if (!UUID_PATTERN.test(orderId) || !isStorefrontConfigured()) return null;

  let admin;
  try {
    admin = createStorefrontAdminClient();
  } catch {
    return null;
  }

  const { data, error } = await admin
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .maybeSingle();

  if (error) {
    console.error('[storefront] order lookup failed:', error.message);
    return null;
  }

  return data;
}

export function addBusinessDays(from: Date, businessDays: number): Date {
  const result = new Date(from);
  let remaining = Math.max(0, Math.trunc(businessDays));

  while (remaining > 0) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) remaining -= 1;
  }

  return result;
}
