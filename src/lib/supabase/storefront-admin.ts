import 'server-only';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import {
  getStorefrontSupabaseServiceRoleKey,
  getStorefrontSupabaseUrl,
} from '@/lib/env-storefront';
import type { Database } from '@/types/database';

export type StorefrontAdminClient = SupabaseClient<Database>;

/** Service-role client for the dedicated storefront Supabase project only. */
export function createStorefrontAdminClient(): StorefrontAdminClient {
  return createClient<Database>(
    getStorefrontSupabaseUrl(),
    getStorefrontSupabaseServiceRoleKey(),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
