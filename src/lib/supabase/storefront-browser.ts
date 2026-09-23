'use client';

import { createBrowserClient } from '@supabase/ssr';

import type { Database } from '@/types/database';

export function createStorefrontBrowserClient() {
  const url = process.env.NEXT_PUBLIC_STOREFRONT_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_STOREFRONT_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;

  return createBrowserClient<Database>(url, anon);
}
