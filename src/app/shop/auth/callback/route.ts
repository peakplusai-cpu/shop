import { NextResponse } from 'next/server';

import { createServerClient, type SetAllCookies } from '@supabase/ssr';
import { cookies } from 'next/headers';

import type { Database } from '@/types/database';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/shop';

  if (!code) {
    return NextResponse.redirect(new URL('/shop/login', request.url));
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_STOREFRONT_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_STOREFRONT_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return NextResponse.redirect(new URL('/shop/login', request.url));
  }

  const cookieStore = await cookies();
  const supabase = createServerClient<Database>(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });

  await supabase.auth.exchangeCodeForSession(code);
  return NextResponse.redirect(new URL(next, request.url));
}
